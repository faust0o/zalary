interface IdenticonProps {
  hash: string | null | undefined;
  size?: number;
  className?: string;
}

const GRID_SIZE = 24;

function stringToBytes(input: string): number[] {
  // If the input is valid hex, parse it directly
  if (/^[0-9a-fA-F]+$/.test(input) && input.length >= 12) {
    const bytes: number[] = [];
    for (let i = 0; i < input.length - 1; i += 2)
      bytes.push(parseInt(input.substring(i, i + 2), 16));
    return bytes;
  }
  // Otherwise, derive bytes from the string using a simple hash
  const bytes: number[] = new Array(32).fill(0);
  for (let i = 0; i < input.length; i++) {
    bytes[i % 32] = (bytes[i % 32] * 31 + input.charCodeAt(i)) & 0xff;
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

  const grid: boolean[][] = [];
  for (let y = 0; y < GRID_SIZE; y++) {
    const row: boolean[] = [];
    for (let x = 0; x < GRID_SIZE; x++) {
      const nx = x / (GRID_SIZE - 1) - 0.5;
      const ny = y / (GRID_SIZE - 1) - 0.5;
      const gradient = ((nx * dx + ny * dy) / extent + 1) / 2;
      const threshold = BAYER8[y % 8][x % 8];
      row.push(gradient > threshold);
    }
    grid.push(row);
  }
  return grid;
}

export function Identicon({ hash, size = 28, className }: IdenticonProps) {
  if (!hash || hash.length < 10) {
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
