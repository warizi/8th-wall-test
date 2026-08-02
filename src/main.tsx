import {createRoot} from 'react-dom/client'
import {App} from './app/App'
import './app/styles/global.css'

// 개발 모드: 폰 화면에서 콘솔을 볼 수 있게 eruda 삽입
if (import.meta.env.DEV) {
  import('eruda').then(({default: eruda}) => eruda.init())
}

// StrictMode 미사용: 이중 마운트가 XR8.run() 직후 stop()을 유발해
// 엔진이 죽은 상태로 남는다 (검은 화면). AR 엔진 통합에서는 제외한다.
createRoot(document.getElementById('root')!).render(<App />)
