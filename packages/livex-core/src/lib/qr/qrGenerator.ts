/**
 * Lightweight, zero-dependency QR Code Model 2 generator in pure TypeScript.
 * Produces compliant 2D module matrices and SVG vector elements.
 */

export type QrErrorCorrectionLevel = 'L' | 'M' | 'Q' | 'H';

// Reed-Solomon Galois Field 256 math tables
const EXP_TABLE: number[] = new Array(256);
const LOG_TABLE: number[] = new Array(256);

for (let i = 0, x = 1; i < 256; i++) {
  EXP_TABLE[i] = x;
  LOG_TABLE[x] = i;
  x = (x << 1) ^ (x & 128 ? 0x11d : 0);
}

function glog(n: number): number {
  if (n < 1) throw new Error(`glog(${n})`);
  return LOG_TABLE[n];
}

function gexp(n: number): number {
  while (n < 0) n += 255;
  while (n >= 256) n -= 255;
  return EXP_TABLE[n];
}

class Polynomial {
  constructor(public num: number[], shift = 0) {
    let offset = 0;
    while (offset < num.length && num[offset] === 0) offset++;
    this.num = new Array(num.length - offset + shift);
    for (let i = 0; i < num.length - offset; i++) {
      this.num[i] = num[i + offset];
    }
    for (let i = num.length - offset; i < this.num.length; i++) {
      this.num[i] = 0;
    }
  }

  get(index: number): number {
    return this.num[index];
  }

  getLength(): number {
    return this.num.length;
  }

  multiply(e: Polynomial): Polynomial {
    const num = new Array(this.getLength() + e.getLength() - 1).fill(0);
    for (let i = 0; i < this.getLength(); i++) {
      for (let j = 0; j < e.getLength(); j++) {
        num[i + j] ^= gexp(glog(this.get(i)) + glog(e.get(j)));
      }
    }
    return new Polynomial(num);
  }

  mod(e: Polynomial): Polynomial {
    if (this.getLength() - e.getLength() < 0) return this;
    const ratio = glog(this.get(0)) - glog(e.get(0));
    const num = new Array(this.getLength());
    for (let i = 0; i < this.getLength(); i++) num[i] = this.get(i);
    for (let i = 0; i < e.getLength(); i++) {
      num[i] ^= gexp(glog(e.get(i)) + ratio);
    }
    return new Polynomial(num).mod(e);
  }
}

class BitBuffer {
  buffer: number[] = [];
  length = 0;

  get(index: number): boolean {
    const bufIndex = Math.floor(index / 8);
    return ((this.buffer[bufIndex] >>> (7 - (index % 8))) & 1) === 1;
  }

  put(num: number, length: number) {
    for (let i = 0; i < length; i++) {
      this.putBit(((num >>> (length - i - 1)) & 1) === 1);
    }
  }

  putBit(bit: boolean) {
    const bufIndex = Math.floor(this.length / 8);
    if (this.buffer.length <= bufIndex) {
      this.buffer.push(0);
    }
    if (bit) {
      this.buffer[bufIndex] |= 0x80 >>> (this.length % 8);
    }
    this.length++;
  }
}

// Model 2 Capacity Limits [Version][L, M, Q, H]
const RS_BLOCKS: number[][][] = [
  // Version 1-10 specs [totalCount, dataCount]
  [[1, 26, 19], [1, 26, 16], [1, 26, 13], [1, 26, 9]], // 1
  [[1, 44, 34], [1, 44, 28], [1, 44, 22], [1, 44, 16]], // 2
  [[1, 70, 55], [1, 70, 44], [2, 35, 17], [2, 35, 13]], // 3
  [[1, 100, 80], [2, 50, 32], [2, 50, 24], [4, 25, 9]], // 4
  [[1, 134, 108], [2, 67, 43], [2, 33, 15, 2, 34, 16], [2, 33, 11, 2, 34, 12]], // 5
  [[2, 86, 68], [4, 43, 27], [4, 43, 19], [4, 43, 15]], // 6
  [[2, 98, 78], [4, 49, 31], [2, 32, 14, 4, 33, 15], [4, 39, 13, 1, 40, 14]], // 7
  [[2, 121, 97], [2, 60, 38, 2, 61, 39], [4, 40, 14, 2, 41, 15], [4, 40, 11, 2, 41, 12]], // 8
  [[2, 146, 116], [3, 58, 36, 2, 59, 37], [4, 36, 12, 4, 37, 13], [4, 36, 12, 4, 37, 13]], // 9
  [[2, 86, 68, 2, 87, 69], [4, 69, 43, 1, 70, 44], [6, 43, 15, 2, 44, 16], [6, 43, 12, 2, 44, 13]], // 10
];

const PATTERN_POSITION_TABLE: number[][] = [
  [],
  [6, 18],
  [6, 22],
  [6, 26],
  [6, 30],
  [6, 34],
  [6, 22, 38],
  [6, 24, 42],
  [6, 26, 46],
  [6, 28, 50],
];

const G15 = (1 << 10) | (1 << 8) | (1 << 5) | (1 << 4) | (1 << 2) | (1 << 1) | (1 << 0);
const G15_MASK = (1 << 14) | (1 << 12) | (1 << 10) | (1 << 4) | (1 << 1);

function getBCHTypeInfo(data: number): number {
  let d = data << 10;
  while (getBCHDigit(d) - getBCHDigit(G15) >= 0) {
    d ^= G15 << (getBCHDigit(d) - getBCHDigit(G15));
  }
  return ((data << 10) | d) ^ G15_MASK;
}

function getBCHDigit(data: number): number {
  let digit = 0;
  while (data !== 0) {
    digit++;
    data >>>= 1;
  }
  return digit;
}

export class QrMatrixGenerator {
  typeNumber = 4;
  errorCorrectLevel: number;
  modules: (boolean | null)[][] = [];
  moduleCount = 0;

  constructor(level: QrErrorCorrectionLevel = 'M') {
    switch (level) {
      case 'L':
        this.errorCorrectLevel = 1;
        break;
      case 'M':
        this.errorCorrectLevel = 0;
        break;
      case 'Q':
        this.errorCorrectLevel = 3;
        break;
      case 'H':
        this.errorCorrectLevel = 2;
        break;
    }
  }

  generate(dataStr: string): boolean[][] {
    const bytes: number[] = [];
    for (let i = 0; i < dataStr.length; i++) {
      const code = dataStr.charCodeAt(i);
      if (code < 0x80) {
        bytes.push(code);
      } else if (code < 0x800) {
        bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
      } else if (code < 0x10000) {
        bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
      } else {
        bytes.push(
          0xf0 | (code >> 18),
          0x80 | ((code >> 12) & 0x3f),
          0x80 | ((code >> 6) & 0x3f),
          0x80 | (code & 0x3f)
        );
      }
    }

    // Determine version based on byte length
    for (let v = 1; v <= 10; v++) {
      const rs = RS_BLOCKS[v - 1][this.errorCorrectLevel];
      let capacity = 0;
      for (let i = 0; i < rs.length; i += 3) {
        capacity += rs[i] * rs[i + 2];
      }
      if (bytes.length + 3 <= capacity) {
        this.typeNumber = v;
        break;
      }
    }

    this.moduleCount = this.typeNumber * 4 + 17;
    this.modules = Array.from({ length: this.moduleCount }, () =>
      new Array(this.moduleCount).fill(null)
    );

    // Setup function patterns
    this.setupPositionProbePattern(0, 0);
    this.setupPositionProbePattern(this.moduleCount - 7, 0);
    this.setupPositionProbePattern(0, this.moduleCount - 7);
    this.setupPositionAdjustPattern();
    this.setupTimingPattern();
    this.setupTypeInfo(0);

    // Encode data
    const buffer = new BitBuffer();
    buffer.put(4, 4); // 8-bit byte mode
    buffer.put(bytes.length, this.typeNumber < 10 ? 8 : 16);
    for (const b of bytes) buffer.put(b, 8);

    const rs = RS_BLOCKS[this.typeNumber - 1][this.errorCorrectLevel];
    let totalDataCount = 0;
    for (let i = 0; i < rs.length; i += 3) {
      totalDataCount += rs[i] * rs[i + 2];
    }

    while (buffer.length + 4 <= totalDataCount * 8) buffer.put(0, 4);
    while (buffer.length % 8 !== 0) buffer.putBit(false);
    while (buffer.length < totalDataCount * 8) {
      buffer.put(0xec, 8);
      if (buffer.length < totalDataCount * 8) buffer.put(0x11, 8);
    }

    const dataBlocks = this.createData(buffer, rs);
    this.mapData(dataBlocks, 0);

    return this.modules.map((row) => row.map((cell) => cell ?? false));
  }

  private setupPositionProbePattern(row: number, col: number) {
    for (let r = -1; r <= 7; r++) {
      if (row + r <= -1 || this.moduleCount <= row + r) continue;
      for (let c = -1; c <= 7; c++) {
        if (col + c <= -1 || this.moduleCount <= col + c) continue;
        if (
          (0 <= r && r <= 6 && (c === 0 || c === 6)) ||
          (0 <= c && c <= 6 && (r === 0 || r === 6)) ||
          (2 <= r && r <= 4 && 2 <= c && c <= 4)
        ) {
          this.modules[row + r][col + c] = true;
        } else {
          this.modules[row + r][col + c] = false;
        }
      }
    }
  }

  private setupTimingPattern() {
    for (let i = 8; i < this.moduleCount - 8; i++) {
      if (this.modules[i][6] === null) this.modules[i][6] = i % 2 === 0;
      if (this.modules[6][i] === null) this.modules[6][i] = i % 2 === 0;
    }
  }

  private setupPositionAdjustPattern() {
    const pos = PATTERN_POSITION_TABLE[this.typeNumber - 1] || [];
    for (let i = 0; i < pos.length; i++) {
      for (let j = 0; j < pos.length; j++) {
        const row = pos[i];
        const col = pos[j];
        if (this.modules[row][col] !== null) continue;
        for (let r = -2; r <= 2; r++) {
          for (let c = -2; c <= 2; c++) {
            if (
              Math.abs(r) === 2 ||
              Math.abs(c) === 2 ||
              (r === 0 && c === 0)
            ) {
              this.modules[row + r][col + c] = true;
            } else {
              this.modules[row + r][col + c] = false;
            }
          }
        }
      }
    }
  }

  private setupTypeInfo(maskPattern: number) {
    const data = (this.errorCorrectLevel << 3) | maskPattern;
    const bits = getBCHTypeInfo(data);

    for (let i = 0; i < 15; i++) {
      const mod = ((bits >> i) & 1) === 1;
      if (i < 6) this.modules[i][8] = mod;
      else if (i < 8) this.modules[i + 1][8] = mod;
      else this.modules[this.moduleCount - 15 + i][8] = mod;

      if (i < 8) this.modules[8][this.moduleCount - i - 1] = mod;
      else if (i < 9) this.modules[8][15 - i - 1 + 1] = mod;
      else this.modules[8][15 - i - 1] = mod;
    }
    this.modules[this.moduleCount - 8][8] = true;
  }

  private createData(buffer: BitBuffer, rs: number[]): number[] {
    let offset = 0;
    const dcData: number[][] = [];
    const ecData: number[][] = [];

    for (let i = 0; i < rs.length; i += 3) {
      const count = rs[i];
      const totalCount = rs[i + 1];
      const dataCount = rs[i + 2];
      for (let c = 0; c < count; c++) {
        const dc: number[] = [];
        for (let j = 0; j < dataCount; j++) {
          let b = 0;
          for (let k = 0; k < 8; k++) {
            if (buffer.get(offset + j * 8 + k)) b |= 1 << (7 - k);
          }
          dc.push(b);
        }
        offset += dataCount * 8;
        dcData.push(dc);

        // Compute Reed-Solomon EC
        const ecCount = totalCount - dataCount;
        let rsPoly = new Polynomial([1]);
        for (let j = 0; j < ecCount; j++) {
          rsPoly = rsPoly.multiply(new Polynomial([1, gexp(j)]));
        }
        const rawPoly = new Polynomial(dc, rsPoly.getLength() - 1);
        const modPoly = rawPoly.mod(rsPoly);
        const ec: number[] = new Array(rsPoly.getLength() - 1).fill(0);
        for (let j = 0; j < ec.length; j++) {
          const modIndex = j + modPoly.getLength() - ec.length;
          ec[j] = modIndex >= 0 ? modPoly.get(modIndex) : 0;
        }
        ecData.push(ec);
      }
    }

    const result: number[] = [];
    let maxDc = 0;
    for (const d of dcData) maxDc = Math.max(maxDc, d.length);
    for (let i = 0; i < maxDc; i++) {
      for (const d of dcData) {
        if (i < d.length) result.push(d[i]);
      }
    }
    let maxEc = 0;
    for (const e of ecData) maxEc = Math.max(maxEc, e.length);
    for (let i = 0; i < maxEc; i++) {
      for (const e of ecData) {
        if (i < e.length) result.push(e[i]);
      }
    }
    return result;
  }

  private mapData(data: number[], maskPattern: number) {
    let inc = -1;
    let row = this.moduleCount - 1;
    let bitIndex = 7;
    let byteIndex = 0;

    for (let col = this.moduleCount - 1; col > 0; col -= 2) {
      if (col === 6) col--;
      while (true) {
        for (let c = 0; c < 2; c++) {
          if (this.modules[row][col - c] === null) {
            let dark = false;
            if (byteIndex < data.length) {
              dark = ((data[byteIndex] >>> bitIndex) & 1) === 1;
            }
            // Mask pattern 0: (row + col) % 2 === 0
            const mask = (row + (col - c)) % 2 === 0;
            if (mask) dark = !dark;
            this.modules[row][col - c] = dark;
            bitIndex--;
            if (bitIndex === -1) {
              byteIndex++;
              bitIndex = 7;
            }
          }
        }
        row += inc;
        if (row < 0 || this.moduleCount <= row) {
          row -= inc;
          inc = -inc;
          break;
        }
      }
    }
  }
}

/**
 * Generate a 2D boolean matrix representing the QR Code modules
 */
export function generateQrMatrix(text: string, level: QrErrorCorrectionLevel = 'M'): boolean[][] {
  const qr = new QrMatrixGenerator(level);
  return qr.generate(text);
}

/**
 * Generate an SVG string for crisp vector display on any screen resolution
 */
export function generateQrSvg(
  text: string,
  options: {
    size?: number;
    margin?: number;
    fgColor?: string;
    bgColor?: string;
  } = {}
): string {
  const matrix = generateQrMatrix(text);
  const size = options.size || 256;
  const margin = options.margin ?? 4;
  const fgColor = options.fgColor || '#000000';
  const bgColor = options.bgColor || '#ffffff';

  const n = matrix.length;
  const totalCells = n + margin * 2;
  const cellSize = size / totalCells;

  let pathData = '';
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (matrix[r][c]) {
        const x = (c + margin) * cellSize;
        const y = (r + margin) * cellSize;
        pathData += `M${x.toFixed(2)},${y.toFixed(2)}h${cellSize.toFixed(2)}v${cellSize.toFixed(2)}h-${cellSize.toFixed(2)}z `;
      }
    }
  }

  const sanitizeColor = (color: string, fallback: string): string => {
    const cleaned = String(color).trim();
    if (/^[#a-zA-Z0-9(),. %-]+$/.test(cleaned) && !/["'<>`\\]/.test(cleaned)) {
      return cleaned;
    }
    return fallback;
  };

  const safeFgColor = sanitizeColor(fgColor, '#000000');
  const safeBgColor = sanitizeColor(bgColor, '#ffffff');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" shape-rendering="crispEdges">
  <rect width="${size}" height="${size}" fill="${safeBgColor}" rx="12" />
  <path d="${pathData.trim()}" fill="${safeFgColor}" />
</svg>`;
}
