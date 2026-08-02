/**
 * AR 엔진 토글.
 * - 기본: 'xr8' (8th Wall World Tracking — 바닥 배치)
 * - 대체: 'mindar' (MindAR 이미지 타겟 — 완전 오픈소스 MIT, 라이선스 리스크 0)
 *
 * 선택 우선순위: URL 쿼리 ?engine=mindar > 환경변수 VITE_AR_ENGINE > 기본값.
 * 페이지 로드 시 1회 결정 (전환은 새로고침).
 */
export type AREngine = 'xr8' | 'mindar'

export function getAREngine(): AREngine {
  const q = new URLSearchParams(window.location.search).get('engine')
  if (q === 'mindar' || q === 'xr8') return q
  return import.meta.env.VITE_AR_ENGINE === 'mindar' ? 'mindar' : 'xr8'
}

/** 다른 엔진으로 새로고침 전환 */
export function switchAREngine(engine: AREngine) {
  const url = new URL(window.location.href)
  url.searchParams.set('engine', engine)
  window.location.href = url.toString()
}
