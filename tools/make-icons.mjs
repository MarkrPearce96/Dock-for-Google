import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';

// --- CRC32 (PNG spec) ---
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const body = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

// --- Draw one RGBA square icon ---
function drawIcon(size) {
  const bg = [79, 70, 229];      // indigo
  const fg = [255, 255, 255];    // white grid squares
  const px = (x, y) => {
    // 2x2 grid of white squares on the indigo background
    const unit = size / 8;
    const cells = [
      [1.5, 1.5], [4.5, 1.5], [1.5, 4.5], [4.5, 4.5],
    ];
    for (const [cx, cy] of cells) {
      if (
        x >= cx * unit && x < cx * unit + unit * 1.5 &&
        y >= cy * unit && y < cy * unit + unit * 1.5
      ) return fg;
    }
    return bg;
  };
  // raw image: each row prefixed with filter byte 0
  const raw = Buffer.alloc(size * (1 + size * 4));
  let o = 0;
  for (let y = 0; y < size; y++) {
    raw[o++] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      const [r, g, b] = px(x, y);
      raw[o++] = r; raw[o++] = g; raw[o++] = b; raw[o++] = 255;
    }
  }
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 6;   // color type RGBA
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const idat = deflateSync(raw);
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

mkdirSync(new URL('../src/icons/', import.meta.url), { recursive: true });
for (const size of [48, 128, 256, 512]) {
  const png = drawIcon(size);
  writeFileSync(new URL(`../src/icons/icon-${size}.png`, import.meta.url), png);
  console.log(`wrote src/icons/icon-${size}.png (${png.length} bytes)`);
}
