import { pointsToString, polygonVertices, valuePolygon } from './radar';

describe('polygonVertices', () => {
  it('starts straight up and goes clockwise', () => {
    const [top, right] = polygonVertices(5, 10, 50, 50);
    expect(top.x).toBeCloseTo(50);
    expect(top.y).toBeCloseTo(40);
    expect(right.x).toBeGreaterThan(50);
    expect(right.y).toBeLessThan(50);
  });
  it('puts every vertex at the radius', () => {
    polygonVertices(5, 10, 0, 0).forEach((p) => expect(Math.hypot(p.x, p.y)).toBeCloseTo(10));
  });
});

describe('valuePolygon', () => {
  it('collapses to the centre at 0 and the outline at 1', () => {
    valuePolygon([0, 0, 0, 0, 0], 10, 5, 5).forEach((p) => expect(p).toEqual({ x: 5, y: 5 }));
    const full = valuePolygon([1, 1, 1, 1, 1], 10, 0, 0);
    full.forEach((p) => expect(Math.hypot(p.x, p.y)).toBeCloseTo(10));
  });
  it('clamps out-of-range and non-finite values', () => {
    const p = valuePolygon([2, -1, NaN, 0.5, 1], 10, 0, 0);
    expect(Math.hypot(p[0].x, p[0].y)).toBeCloseTo(10);
    expect(Math.hypot(p[1].x, p[1].y)).toBeCloseTo(0);
    expect(Math.hypot(p[2].x, p[2].y)).toBeCloseTo(0);
    expect(Math.hypot(p[3].x, p[3].y)).toBeCloseTo(5);
  });
});

describe('pointsToString', () => {
  it('formats an svg points attribute', () => {
    expect(pointsToString([{ x: 1, y: 2 }, { x: 3.456, y: 4 }])).toBe('1.00,2.00 3.46,4.00');
  });
});
