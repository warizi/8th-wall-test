import {useXRStatusStore} from '@/shared/xr8/xrStatusStore'

/**
 * 로딩/에러 게이트 — XRExtras Loading 모듈 대체 (해당 모듈은 검은 커버가
 * 해제되지 않는 문제로 미사용). 첫 SLAM 프레임 수신 시 사라진다.
 */
export function LoadingGate() {
  const phase = useXRStatusStore((s) => s.phase)
  const errorMessage = useXRStatusStore((s) => s.errorMessage)

  if (phase === 'ready') return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#000',
        display: 'grid',
        placeItems: 'center',
        zIndex: 100,
        transition: 'opacity .3s',
      }}
    >
      <div style={{textAlign: 'center', padding: 24}}>
        {phase === 'loading' ? (
          <>
            <div
              style={{
                width: 36,
                height: 36,
                margin: '0 auto 16px',
                border: '3px solid rgba(255,255,255,.2)',
                borderTopColor: '#7c5cff',
                borderRadius: '50%',
                animation: 'spin 0.9s linear infinite',
              }}
            />
            <p style={{fontSize: 16, marginBottom: 8}}>공간을 준비하고 있어요…</p>
            <p style={{fontSize: 13, opacity: 0.6}}>
              카메라 권한을 허용해 주세요
            </p>
          </>
        ) : (
          <>
            <p style={{fontSize: 16, marginBottom: 8}}>시작할 수 없어요</p>
            <p style={{fontSize: 13, opacity: 0.6, marginBottom: 16}}>
              {errorMessage ?? '카메라 권한을 확인한 뒤 다시 시도해 주세요'}
            </p>
            <button
              onClick={() => location.reload()}
              style={{
                minHeight: 44,
                padding: '10px 20px',
                borderRadius: 22,
                border: '1px solid rgba(255,255,255,.3)',
                background: 'transparent',
                color: '#fff',
                fontSize: 14,
              }}
            >
              다시 시도
            </button>
          </>
        )}
      </div>
    </div>
  )
}
