
function ai(e) {
  const inside = own[ix(e.x, e.y)] === e.id;

  if (inside && e.trail.length === 0) {
    e.out = 0;
    e.home = { x: e.x, y: e.y };
    e.limit = 12 + (Math.random() * 16 | 0);
  }

  if (!inside) e.out++;

  const dirs = [
    [e.dx, e.dy],
    [-e.dy, e.dx],
    [e.dy, -e.dx]
  ];

  const returning =
    e.trail.length > e.limit ||
    e.out > e.limit ||
    e.trail.length > 35;

  let best = null;
  let bestScore = -Infinity;

  for (const d of dirs) {
    const nx = e.x + d[0];
    const ny = e.y + d[1];

    if (nx < 1 || ny < 1 || nx >= N - 1 || ny >= N - 1) continue;

    const i = ix(nx, ny);

    if (trl[i] === e.id) continue;

    let score = Math.random() * 2;

    if (trl[i]) score -= 80;

    if (own[i] === 0) score += 10;
    if (own[i] === e.id) score += 8;
    if (own[i] !== e.id && own[i] !== 0) score += 3;

    if (d[0] === e.dx && d[1] === e.dy) score += 3;

    const edge = Math.min(nx, ny, N - nx, N - ny);
    score += Math.min(edge, 12) * 1.2;

    for (let step = 1; step <= 4; step++) {
      const fx = nx + d[0] * step;
      const fy = ny + d[1] * step;

      if (fx < 1 || fy < 1 || fx >= N - 1 || fy >= N - 1) {
        score -= 15;
        break;
      }

      const fi = ix(fx, fy);

      if (trl[fi] === e.id) {
        score -= 20;
      } else if (trl[fi]) {
        score -= 8;
      } else if (own[fi] === e.id) {
        score += 2;
      } else {
        score += 1;
      }
    }

    for (const v of ents) {
      if (v === e || !v.alive) continue;

      const dist = Math.abs(v.x - nx) + Math.abs(v.y - ny);

      if (dist <= 2) score -= 18;
      else if (dist <= 4) score -= 7;
    }

    if (returning) {
      if (own[i] === e.id) score += 100;

      const homeDist =
        Math.abs(e.home.x - nx) +
        Math.abs(e.home.y - ny);

      const oldDist =
        Math.abs(e.home.x - e.x) +
        Math.abs(e.home.y - e.y);

      if (homeDist < oldDist) score += 6;
    } else {
      if (own[i] === 0) score += 8;

      if (own[i] === e.id && e.trail.length > 0) score -= 2;
    }

    for (const p of pu) {
      const dist = Math.abs(p.x - nx) + Math.abs(p.y - ny);
      if (dist < 8) score += (8 - dist) * 0.4;
    }

    for (const t of towers) {
      if (!t.o) {
        const dist = Math.abs(t.x - nx) + Math.abs(t.y - ny);
        if (dist < 12) score += (12 - dist) * 0.3;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      best = d;
    }
  }

  if (best) {
    e.dx = best[0];
    e.dy = best[1];
  }
}
