import basicSsl from '@vitejs/plugin-basic-ssl'
import react from '@vitejs/plugin-react'
import {defineConfig} from 'vite'
import {VitePWA} from 'vite-plugin-pwa'

// 엔진(xr.js 등)은 public/external/ 자체 호스팅 — 번들 대상에서 제외됨.
// basicSsl: 실기기 카메라 테스트용 로컬 HTTPS (자체 서명 — 폰에서 경고 1회 통과 필요)
export default defineConfig({
  // GitHub Pages 등 하위 경로 배포용 — CI에서 BASE_PATH=/저장소명/ 으로 주입
  base: process.env.BASE_PATH ?? '/',
  plugins: [
    react(),
    basicSsl(),
    VitePWA({
      registerType: 'autoUpdate',
      // 프리캐시: 앱 셸 + 엔진 코어(xr.js, xr-slam.js) + 모델.
      // 제외: xr-face.js / face·semantics 리소스(SLAM에 불필요, 15MB↓),
      //       xrextras·landing-page(미사용), 대화 JSON(SWR로 갱신 반영)
      workbox: {
        globPatterns: [
          '**/*.{js,css,html,ico,svg,png,webmanifest}',
          'models/*.glb',
          'targets/xr8/*.json',
          'external/xr/xr.js',
          'external/xr/xr-slam.js',
        ],
        globIgnores: [
          'external/xr/xr-face.js',
          'external/xr/resources/**',
          'external/xrextras/**',
          'external/landing-page/**',
          'dialogue/**',
        ],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024, // xr-slam.js 5.3MB
        runtimeCaching: [
          {
            // 엔진이 런타임에 fetch하는 워커/리소스 — 첫 사용 시 캐시
            urlPattern: /\/external\/xr\/resources\//,
            handler: 'CacheFirst',
            options: {cacheName: 'xr-resources'},
          },
          {
            // 대화 스크립트 — 접속 시 갱신 확인, 오프라인이면 캐시 사용
            urlPattern: /\/dialogue\//,
            handler: 'StaleWhileRevalidate',
            options: {cacheName: 'dialogue'},
          },
        ],
      },
      manifest: {
        name: 'AR 캐릭터 대화 체험',
        short_name: '코코 AR',
        description: '브라우저로 내 공간에 캐릭터를 불러내 대화하는 WebAR 체험',
        lang: 'ko',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#000000',
        theme_color: '#000000',
        // 하위 경로 배포 대응: manifest 기준 상대 경로
        icons: [
          {src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png'},
          {src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png'},
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {'@': '/src'},
  },
  server: {
    host: true, // 같은 와이파이의 폰에서 접속 가능하게
  },
  preview: {
    host: true,
  },
})
