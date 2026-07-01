export function insertionIndex(centers, x, y) {
  if (centers.length === 0) return 0;
  let best = 0;
  let bestD = Infinity;
  for (let i = 0; i < centers.length; i++) {
    const dx = centers[i].x - x;
    const dy = centers[i].y - y;
    const d = dx * dx + dy * dy;
    if (d < bestD) { bestD = d; best = i; }
  }
  return x < centers[best].x ? best : best + 1;
}
