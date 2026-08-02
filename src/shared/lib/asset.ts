/**
 * public/ 자산의 배포 경로 해석.
 * GitHub Pages처럼 하위 경로(base)에 배포될 때를 대비해
 * 런타임 fetch/로더 URL은 반드시 이 헬퍼를 거친다.
 * (index.html 안의 URL은 Vite가 빌드 시 자동으로 base를 붙여줌)
 */
export function asset(path: string): string {
  return import.meta.env.BASE_URL + path.replace(/^\//, '')
}
