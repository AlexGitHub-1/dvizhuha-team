export interface PathGeo { pts: [number, number][]; len: number; posAt(d: number): [number, number, number]; dist(x: number, y: number): number }

export function makePath(pts: [number, number][]): PathGeo {
  const segs = pts.slice(1).map((b, i) => { const a = pts[i]!; return { a, b, len: Math.hypot(b[0] - a[0], b[1] - a[1]) }; });
  const len = segs.reduce((s, x) => s + x.len, 0);
  return {
    pts, len,
    posAt(d) {
      let r = Math.max(0, d);
      for (const s of segs) {
        if (r <= s.len) { const t = r / s.len; return [s.a[0] + (s.b[0] - s.a[0]) * t, s.a[1] + (s.b[1] - s.a[1]) * t, Math.atan2(s.b[1] - s.a[1], s.b[0] - s.a[0])]; }
        r -= s.len;
      }
      const l = segs[segs.length - 1]!; return [l.b[0], l.b[1], 0];
    },
    dist(x, y) {
      let m = Infinity;
      for (const s of segs) {
        const dx = s.b[0] - s.a[0], dy = s.b[1] - s.a[1];
        const t = Math.max(0, Math.min(1, ((x - s.a[0]) * dx + (y - s.a[1]) * dy) / (s.len * s.len)));
        m = Math.min(m, Math.hypot(x - (s.a[0] + dx * t), y - (s.a[1] + dy * t)));
      }
      return m;
    },
  };
}
