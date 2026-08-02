/**
 * 8th Wall 엔진 파일을 node_modules → public/external/ 로 복사한다.
 *
 * 라이선스 제약 (XR Engine License Agreement):
 * - 엔진 파일은 "원본 그대로" (수정/미니파이 금지) 배포해야 하므로
 *   번들러를 거치지 않는 public/ 에 두고 <script> 태그로 로드한다.
 * - LICENSE 및 저작권 헤더를 반드시 함께 복사한다.
 */
import {cpSync, mkdirSync, rmSync} from 'node:fs'
import {dirname, join} from 'node:path'
import {fileURLToPath} from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

const targets = [
  {from: 'node_modules/@8thwall/engine-binary/dist', to: 'public/external/xr'},
  {from: 'node_modules/@8thwall/xrextras/dist', to: 'public/external/xrextras'},
  {from: 'node_modules/@8thwall/landing-page/dist', to: 'public/external/landing-page'},
]

for (const {from, to} of targets) {
  const dest = join(root, to)
  rmSync(dest, {recursive: true, force: true})
  mkdirSync(dest, {recursive: true})
  cpSync(join(root, from), dest, {recursive: true})
  console.log(`synced ${from} -> ${to}`)
}
