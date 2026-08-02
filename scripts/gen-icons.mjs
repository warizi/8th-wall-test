/**
 * PWA 아이콘 생성 — 의존성 없이 PNG를 직접 인코딩한다.
 * 보라 배경 + 흰 원 (캐릭터 실루엣 대용). 디자인 교체는 추후.
 */
import {deflateSync} from 'node:zlib'
import {writeFileSync, mkdirSync} from 'node:fs'
import {dirname, join} from 'node:path'
import {fileURLToPath} from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

const CRC_TABLE = Array.from({length: 256}, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
const crc32 = (buf) => {
  let c = 0xffffffff
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
const chunk = (type, data) => {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

function makeIcon(size) {
  const bg = [0x7c, 0x5c, 0xff] // 보라
  const fg = [0xff, 0xff, 0xff]
  const cx = size / 2
  const headY = size * 0.38
  const headR = size * 0.17
  const bodyY = size * 0.72
  const bodyRx = size * 0.24
  const bodyRy = size * 0.2

  const rows = []
  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 4)
    row[0] = 0 // filter: none
    for (let x = 0; x < size; x++) {
      const inHead = (x - cx) ** 2 + (y - headY) ** 2 <= headR ** 2
      const inBody = ((x - cx) / bodyRx) ** 2 + ((y - bodyY) / bodyRy) ** 2 <= 1 && y < bodyY
      const [r, g, b] = inHead || inBody ? fg : bg
      const o = 1 + x * 4
      row[o] = r
      row[o + 1] = g
      row[o + 2] = b
      row[o + 3] = 255
    }
    rows.push(row)
  }

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(Buffer.concat(rows))),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

mkdirSync(join(root, 'public/icons'), {recursive: true})
for (const size of [180, 192, 512]) {
  writeFileSync(join(root, `public/icons/icon-${size}.png`), makeIcon(size))
  console.log(`icon-${size}.png 생성`)
}
