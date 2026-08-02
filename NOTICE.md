# Third-Party Notices

## Niantic Spatial XR Engine

This product includes the XR Engine software developed by Niantic Spatial, Inc.

Copyright © 2026 Niantic Spatial, Inc. All rights reserved.

- 라이선스: XR Engine License Agreement (`node_modules/@8thwall/engine-binary/LICENSE`,
  배포 시 `public/external/xr/LICENSE`로 함께 서빙됨)
- 사용 파일: `xr.js`, `xr-slam.js` (+ 런타임 리소스) — **원본 그대로, 수정·미니파이 없이**
  `public/external/xr/`에 자체 호스팅 (`npm run sync-xr`로 복사)
- 저작권 고지: 각 파일 상단 헤더 보존 + `index.html` 주석에 명시

### 라이선스 체크리스트 (기획서 14번 — 배포 전 최종 확인)

- [x] `external/xr/xr.js`를 수정 없이 포함 (public/ 배치로 번들러 미경유)
- [x] 저작권 문구가 파일 상단에 보존됨
- [x] `index.html`에 저작권·라이선스 주석 명시
- [x] 리버스 엔지니어링/수정/재배포 없음 (npm 원본 복사만)
- [x] MIT 패키지(xrextras, landing-page)는 현재 미사용 — 배포 산출물에서 제외
- [ ] **상업 배포 전 필수 확인**: 제품이 "유료 제공"이면서 "가치가 전적으로/상당 부분
      엔진 기능에서 나오는" 구조인지 여부 (License §1.2 제한) — **법무 검토 권장**.
      본 프로토타입의 가치는 캐릭터 IP·대화 콘텐츠에 있다고 보나, 유료화 시점에
      반드시 재검토할 것.

### 참고

- 엔진 버전 고정: `@8thwall/engine-binary@1.0.0` (package.json) — 커뮤니티 이관 직후라
  유지보수가 불확실하므로 버전 업데이트는 신중히.
