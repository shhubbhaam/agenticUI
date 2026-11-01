// Pure polygon geometry for radar (spider) charts. Zero RN imports.
export interface Point {
  x: number;
  y: number;
}

// Vertices of a regular `count`-gon, first vertex straight up, clockwise.
export function polygonVertices(count: number, radius: number, cx: number, cy: number): Point[] {
  return Array.from({ length: count }, (_, i) => {
    const angle = (2 * Math.PI * i) / count - Math.PI / 2;
    return { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
  });
}

// One vertex per value, each pulled toward the centre by its 0..1 value.
export function valuePolygon(values: number[], radius: number, cx: number, cy: number): Point[] {
  return values.map((value, i) => {
    const clamped = Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
    return polygonVertices(values.length, radius * clamped, cx, cy)[i];
  });
}

export function pointsToString(points: Point[]): string {
  return points.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');
}
