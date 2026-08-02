/**
 * 개발용 진단 오버레이 — 파이프라인 상태를 화면 + 콘솔에 노출.
 * 프로덕션 빌드에서는 아무것도 하지 않는다.
 */
const state: Record<string, string> = {}

let el: HTMLDivElement | null = null

function ensureEl() {
  if (el) return el
  el = document.createElement('div')
  el.style.cssText =
    'position:fixed;left:8px;bottom:calc(env(safe-area-inset-bottom) + 8px);z-index:9999;' +
    'font:11px/1.5 monospace;color:#0f0;background:rgba(0,0,0,.55);padding:6px 8px;' +
    'border-radius:6px;pointer-events:none;white-space:pre-wrap;word-break:break-all;max-width:92vw'
  document.body.appendChild(el)
  return el
}

export function debugStatus(key: string, value: string) {
  if (!import.meta.env.DEV) return
  state[key] = value
  console.log(`[xr8-debug] ${key}: ${value}`)
  ensureEl().textContent = Object.entries(state)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n')
}
