interface IdenticonProps {
  hash: string | null | undefined;
  size?: number;
  className?: string;
}

const GRID_SIZE = 24;

// cyrb128 (public domain, bryc): a fast 128-bit string hash in which every
// character affects every output bit, so even one-letter names that differ
// get unrelated icons.
function cyrb128(input: string): [number, number, number, number] {
  let h1 = 1779033703,
    h2 = 3144134277,
    h3 = 1013904242,
    h4 = 2773480762;
  for (let i = 0; i < input.length; i++) {
    const k = input.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  h1 ^= h2 ^ h3 ^ h4;
  h2 ^= h1;
  h3 ^= h1;
  h4 ^= h1;
  return [h1 >>> 0, h2 >>> 0, h3 >>> 0, h4 >>> 0];
}

/** Deterministic bytes for any string: sfc32 seeded with its hash. */
function stringToBytes(input: string, count = 32): number[] {
  let [a, b, c, d] = cyrb128(input);
  const bytes: number[] = [];
  for (let i = 0; i < count; i++) {
    const t = (((a + b) | 0) + d) | 0;
    d = (d + 1) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    c = (c + t) | 0;
    bytes.push(t >>> 24);
  }
  return bytes;
}

function getColors(bytes: number[]): [fg: string, bg: string] {
  const h = (bytes[0] / 255) * 360;
  const s = 55 + (bytes[1] / 255) * 30;
  const bgL = 25 + (bytes[2] / 255) * 12;
  const fgL = bgL + 25;
  return [
    `hsl(${h}, ${s}%, ${fgL}%)`,
    `hsl(${h}, ${s}%, ${bgL}%)`,
  ];
}

// 8x8 Bayer ordered dithering matrix, normalized to 0–1
const BAYER8 = [
  [ 0, 32,  8, 40,  2, 34, 10, 42],
  [48, 16, 56, 24, 50, 18, 58, 26],
  [12, 44,  4, 36, 14, 46,  6, 38],
  [60, 28, 52, 20, 62, 30, 54, 22],
  [ 3, 35, 11, 43,  1, 33,  9, 41],
  [51, 19, 59, 27, 49, 17, 57, 25],
  [15, 47,  7, 39, 13, 45,  5, 37],
  [63, 31, 55, 23, 61, 29, 53, 21],
].map(row => row.map(v => (v + 0.5) / 64));

function generateGrid(bytes: number[]): boolean[][] {
  // Gradient angle from hash
  const angle = ((bytes[4] << 8 | bytes[5]) / 65535) * Math.PI * 2;
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  const extent = (Math.abs(dx) + Math.abs(dy)) * 0.5;
  // Where the gradient's midpoint sits, and how steep it is
  const offset = (bytes[6] / 255 - 0.5) * 0.5;
  const steepness = 0.8 + (bytes[7] / 255) * 0.8;

  const grid: boolean[][] = [];
  for (let y = 0; y < GRID_SIZE; y++) {
    const row: boolean[] = [];
    for (let x = 0; x < GRID_SIZE; x++) {
      const nx = x / (GRID_SIZE - 1) - 0.5;
      const ny = y / (GRID_SIZE - 1) - 0.5;
      const gradient =
        (((nx * dx + ny * dy) / extent) * steepness + offset + 1) / 2;
      const threshold = BAYER8[y % 8][x % 8];
      row.push(gradient > threshold);
    }
    grid.push(row);
  }
  return grid;
}

export function Identicon({ hash, size = 28, className }: IdenticonProps) {
  if (!hash) {
    return (
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${GRID_SIZE} ${GRID_SIZE}`}
        shapeRendering="crispEdges"
        className={className}
      >
        <rect width={GRID_SIZE} height={GRID_SIZE} fill="hsl(0, 0%, 25%)" />
      </svg>
    );
  }

  const bytes = stringToBytes(hash);
  const [fg, bg] = getColors(bytes);
  const grid = generateGrid(bytes);

  const rects: { x: number; y: number }[] = [];
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      if (grid[y][x]) rects.push({ x, y });
    }
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${GRID_SIZE} ${GRID_SIZE}`}
      shapeRendering="crispEdges"
      className={className}
    >
      <rect width={GRID_SIZE} height={GRID_SIZE} fill={bg} />
      {rects.map((r, i) => (
        <rect key={i} x={r.x} y={r.y} width={1} height={1} fill={fg} />
      ))}
    </svg>
  );
}
