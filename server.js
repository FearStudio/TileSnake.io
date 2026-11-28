
 // Tile Snake.io — authoritative multiplayer server.
 // Run: npm i && node server.js

const http = require('http');
const { WebSocketServer } = require('ws');

const N = 90, STEP = .12, SLOTS = 12, TICK = 40;
const TOWER_PULSE = 5;

const D = [[0, -1], [1, 0], [0, 1], [-1, 0]];

const COLORS = [
  '#00f0ff', '#ff2e88', '#ffd400', '#7cff4d',
  '#b86bff', '#ff7a1a', '#2e7bff', '#ff4d4d',
  '#4dffd2', '#e0e0ff', '#ffa6ff', '#a6ff00'
];

const BOTS = [
  'Deadlock','Rifted','HavocX','Wraithen','NoMercy',
  'Recoilz','Shatter','Outaimed','Headtap','Erased',
  'Cracked','OneClip','Destroyd','Unfazed','ZeroPinggo',
  'ShadowRush','ToxicNova','Vortex','BlitzKing','GhostMode',
  'PixelFury','StormByte','NightRaid','CyberWolf','VenomShot',
  'FrostBite','RapidFire','DarkPulse','SteelNerve','WildCard',
  'AimStorm','NovaStrike','EchoBlade','TurboSnake','RedZone',
  'SkyHunter','LunarFang','DuskRunner','ZeroFear','KillSwitch',
  'NeonGhost','RageQuit','ArcFlash','SilentRush','DriftKing',
  'AlphaCore','OmegaRush','FireStorm','IceBreaker','VoidWalker',
  'LuckyShot','MindGames','QuickScope','FinalBoss','SnakeByte',
  'ShadowX','BlueVenom','NightFury','ChaosMode','WarpSpeed',
  'LaserLine','DemonDash','CloudNine','DarkMatter','StarFang',
  'IronClaw','MoonStrike','ThunderX','GhostRider','FeralByte',
  'CyberDash','FlameCore','ApexPred','StormChaser','SwiftKill',
  'HyperNova','GlitchLord','TalonX','EdgeRunner','ColdSnap',
  'MysticRush','SnakeKing','PowerSlide','VoidStorm','NeonBlade',
  'DustDevil','RapidRift','ZeroZone','PixelStorm','FangForce',
  'ShadowByte','CrimsonX','BlueStorm','NightShift','WildFang',
  'TurboFang','NovaGhost','RiftRunner','ToxicRush','SteelSnake',
  'FlashPoint','DreadNova','GhostByte','DarkRunner','StormFang',
  'ViperX','EchoRush','FrostNova','BlazeDash','SilentByte',
  'LoneWolf','ChaosX','HyperFang','RoguePixel','NightBlade',
  'VenomCore','SkyRift','FireByte','IceStorm','SwiftFang',
  'NeonRush','ShadowCore','ArcHunter','VoidFang','PixelRogue',
  'ThunderByte','DuskFang','RapidNova','GhostDash','WildNova',
  'CyberFang','DarkRush','BlitzByte','StormRider','FrostDash',
  'LunarRush','SnakeStorm','FlameDash','ZeroFang','RiftBlade',
  'EchoStorm','IronByte','NightNova','ToxicFang','ApexRush',
  'GlitchX','ColdFang','WarpRider','MysticByte','DemonFang',
  'SkyNova','RogueRush','VenomDash','NeonStorm','VoidRush',
  'ShadowFang','TurboNova','PixelDash','BlazeFang','SilentNova'
];

const ix = (x, y) => y * N + x;

const send = (ws, o) => {
  if (ws && ws.readyState === 1) {
    ws.send(JSON.stringify(o));
  }
};

const clean = n =>
  String(n || 'Player')
    .replace(/[^\w .-]/g, '')
    .trim()
    .slice(0, 12) || 'Player';

function Game(code, onEmpty) {
  const own = new Int8Array(N * N);
  const trl = new Int8Array(N * N);
  const dirty = new Set();

  const so = (i, v) => {
    if (own[i] !== v) {
      own[i] = v;
      dirty.add(i);
    }
  };

  const st = (i, v) => {
    if (trl[i] !== v) {
      trl[i] = v;
      dirty.add(i);
    }
  };

  let ents = [];
  let pu = [];
  let towers = [];
  let ev = [];
  let puT = 0;
  let arT = 0;
  let last = Date.now();
  let timer = null;
  let emptyTimer = null;

  const say = m => ev.push({ k: 'say', m });

  const pop = (x, y, txt, col) =>
    ev.push({ k: 'pop', x, y, txt, col });

  // Generate towers
  for (let k = 0; k < 500 && towers.length < 7; k++) {
    const x = 8 + (Math.random() * (N - 16) | 0);
    const y = 8 + (Math.random() * (N - 16) | 0);

    if (
      towers.every(
        t => Math.abs(t.x - x) + Math.abs(t.y - y) > 26
      )
    ) {
      towers.push({ x, y, r: 7, o: 0, wv: null });
    }
  }

  function botName(e) {
    const used = new Set(
      ents
        .filter(x => x !== e && x.bot && x.alive)
        .map(x => x.name)
    );

    const choices = BOTS.filter(n => n !== e.name && !used.has(n));
    const pool = choices.length
      ? choices
      : BOTS.filter(n => n !== e.name);

    return pool[Math.random() * pool.length | 0] || BOTS[0];
  }

  function mk(id) {
    return {
      id,
      name: BOTS[id - 1],
      bot: true,
      ws: null,
      alive: false,
      trail: [],
      acc: 0,
      boost: 0,
      shield: 0,
      out: 0,
      limit: 8,
      respawn: id * .4,
      kills: 0,
      area: 0,
      q: null,
      fuse: null,
      fuseAcc: 0,
      home: { x: 0, y: 0 },
      x: 0,
      y: 0,
      dx: 1,
      dy: 0
    };
  }

  ents = Array.from({ length: SLOTS }, (_, i) => mk(i + 1));

  // SAFE SPAWNING
  function spawn(e) {
    if (e.bot) e.name = botName(e);

    let x = -1, y = -1;
    const margin = 5;
    const radius = 4;
    const candidates = [];

    // Find locations where the surrounding area is completely unclaimed.
    for (let cy = margin; cy < N - margin; cy++) {
      for (let cx = margin; cx < N - margin; cx++) {
        let ok = true;

        for (let dy = -radius; dy <= radius && ok; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const i = ix(cx + dx, cy + dy);

            if (own[i] !== 0 || trl[i] !== 0) {
              ok = false;
              break;
            }
          }
        }

        // Stay clear of tower areas.
        if (ok && towers.some(t =>
          Math.abs(t.x - cx) < 11 &&
          Math.abs(t.y - cy) < 11
        )) {
          ok = false;
        }

        // Stay away from nearby living players and bots.
        if (ok && ents.some(v =>
          v !== e && v.alive &&
          Math.abs(v.x - cx) < 9 &&
          Math.abs(v.y - cy) < 9
        )) {
          ok = false;
        }

        if (ok) candidates.push({ x: cx, y: cy });
      }
    }

    // If no safe spawn exists, retry later.
    if (!candidates.length) {
      e.alive = false;
      e.respawn = 2;
      return false;
    }

    const chosen = candidates[Math.random() * candidates.length | 0];
    x = chosen.x;
    y = chosen.y;

    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        so(ix(x + dx, y + dy), e.id);
      }
    }

    const d = D[Math.random() * 4 | 0];

    Object.assign(e, {
      x,
      y,
      dx: d[0],
      dy: d[1],
      alive: true,
      trail: [],
      acc: 0,
      boost: 0,
      shield: 0,
      out: 0,
      q: null,
      fuse: null,
      fuseAcc: 0,
      stopped: false,
      home: { x, y },
      limit: 8 + (Math.random() * 12 | 0)
    });

    return true;
  }

  function clear(e) {
    for (const i of e.trail) {
      st(i, 0);
    }

    e.trail = [];

    for (let i = 0; i < N * N; i++) {
      if (own[i] === e.id) {
        so(i, 0);
      }
    }
  }

  function blocked(e, dx, dy) {
    const x = e.x + dx;
    const y = e.y + dy;

    if (x < 0 || y < 0 || x >= N || y >= N) {
      return true;
    }

    return trl[ix(x, y)] === e.id;
  }

  // SMARTER BOT AI
  function ai(e) {
    const inside = own[ix(e.x, e.y)] === e.id;

    if (inside && !e.trail.length) {
      e.out = 0;
      e.limit = 8 + (Math.random() * 12 | 0);
      e.home = { x: e.x, y: e.y };
    } else if (!inside) {
      e.out++;
    }

    const candidates = [
      [e.dx, e.dy],
      [-e.dy, e.dx],
      [e.dy, -e.dx]
    ];

    const hx = e.home.x - e.x;
    const hy = e.home.y - e.y;

    const returning = !inside && e.out > e.limit * .65;

    let best = null;
    let bestScore = -Infinity;

    for (const d of candidates) {
      const nx = e.x + d[0];
      const ny = e.y + d[1];

      if (nx < 1 || ny < 1 || nx >= N - 1 || ny >= N - 1) {
        continue;
      }

      const i = ix(nx, ny);

      // Never move into own trail.
      if (trl[i] === e.id) continue;

      let score = Math.random() * 2;

      // Avoid trails.
      if (trl[i]) {
        score -= 1000;
      }

      // Prefer safe territory and open land.
      if (own[i] === e.id) {
        score += 12;
      } else if (own[i] === 0) {
        score += 5;
      } else {
        score += 1;
      }

      // Avoid the board edge.
      const edge = Math.min(nx, ny, N - 1 - nx, N - 1 - ny);
      score += Math.min(edge, 8) * 1.5;

      // Look ahead to judge the next five tiles.
      for (let look = 1; look <= 5; look++) {
        const fx = nx + d[0] * look;
        const fy = ny + d[1] * look;

        if (fx < 1 || fy < 1 || fx >= N - 1 || fy >= N - 1) {
          score -= 12;
          break;
        }

        const fi = ix(fx, fy);

        if (trl[fi] === e.id) {
          score -= 25;
        } else if (trl[fi]) {
          score -= 14;
        } else {
          score += .8;
        }
      }

      // Avoid nearby enemy heads.
      for (const v of ents) {
        if (v === e || !v.alive) continue;

        const dist = Math.abs(v.x - nx) + Math.abs(v.y - ny);

        if (dist < 4) {
          score -= (4 - dist) * 4;
        }

        // Slightly encourage opportunities near exposed trails.
        if (v.trail.length && dist < 7) {
          score += 1.5;
        }
      }

      // Return toward home when exposed too long.
      if (returning) {
        const distance = Math.abs(hx) + Math.abs(hy);

        const toward =
          Math.abs(hx) > Math.abs(hy)
            ? d[0] === Math.sign(hx) && d[1] === 0
            : d[1] === Math.sign(hy) && d[0] === 0;

        if (toward) score += 25 + e.out * 1.5;
        if (distance < 4) score += 10;
      }

      // Move toward nearby perks.
      for (const p of pu) {
        const dist = Math.abs(p.x - nx) + Math.abs(p.y - ny);

        if (dist < 12) {
          score += (12 - dist) * .8;
        }
      }

      // Explore toward unclaimed towers.
      for (const t of towers) {
        if (!t.o) {
          const dist = Math.abs(t.x - nx) + Math.abs(t.y - ny);

          if (dist < 18) {
            score += (18 - dist) * .25;
          }
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

  function hit(v, k) {
    if (v.shield > 0) {
      v.shield = 0;
      pop(v.x, v.y, 'SHIELD BROKEN', '#00f0ff');
      return false;
    }

    die(v, k);
    return true;
  }

  function cut(v, k, killer) {
    if (v.shield > 0) {
      v.shield = 0;
      pop(v.x, v.y, 'SHIELD BROKEN', '#00f0ff');
      return;
    }

    const ci = v.trail[k];

    for (let j = 0; j <= k; j++) {
      st(v.trail[j], 0);
    }

    v.trail = v.trail.slice(k + 1);

    if (!v.fuse) {
      v.fuse = killer;
    }

    v.fuseAcc = 0;

    pop(ci % N, ci / N | 0, 'CUT!', '#ff2e88');
  }

  function die(v, k) {
    v.alive = false;
    v.fuse = null;
    clear(v);

    if (k && k !== v) {
      k.kills++;
      k.boost = 3;
      say(k.name + ' eliminated ' + v.name);
      pop(k.x, k.y, '+KILL', '#ff2e88');
    } else {
      say(v.name + ' crashed');
    }

    if (v.ws) {
      send(v.ws, {
        t: 'dead',
        by: k && k !== v ? k.name : null,
        area: v.area,
        kills: v.kills
      });
    } else {
      v.respawn = 3;
    }
  }

  function capture(e) {
    e.fuse = null;

    for (const i of e.trail) {
      so(i, e.id);
      st(i, 0);
    }

    e.trail = [];

    const seen = new Uint8Array(N * N);
    const stack = [];

    const push = i => {
      if (!seen[i] && own[i] !== e.id) {
        seen[i] = 1;
        stack.push(i);
      }
    };

    for (let k = 0; k < N; k++) {
      push(k);
      push((N - 1) * N + k);
      push(k * N);
      push(k * N + N - 1);
    }

    while (stack.length) {
      const i = stack.pop();
      const x = i % N;
      const y = i / N | 0;

      if (x > 0) push(i - 1);
      if (x < N - 1) push(i + 1);
      if (y > 0) push(i - N);
      if (y < N - 1) push(i + N);
    }

    let gained = 0;
    const victims = new Set();

    for (let i = 0; i < N * N; i++) {
      if (!seen[i] && own[i] !== e.id) {
        so(i, e.id);
        gained++;

        if (trl[i] && trl[i] !== e.id) {
          victims.add(trl[i]);
        }
      }
    }

    if (gained) {
      pop(
        e.x,
        e.y,
        '+' + (gained / (N * N) * 100).toFixed(1) + '%',
        '#7cff4d'
      );
    }

    for (const id of victims) {
      const v = ents[id - 1];
      if (!v.alive) continue;

      let k = -1;

      for (let j = 0; j < v.trail.length; j++) {
        if (own[v.trail[j]] === e.id) {
          k = j;
        }
      }

      if (k >= 0) {
        cut(v, k, e);
      }
    }
  }

  function wave(z) {
    const o = ents[z.o - 1];

    for (
      let y = Math.max(0, Math.floor(z.y - z.r));
      y <= Math.min(N - 1, Math.ceil(z.y + z.r));
      y++
    ) {
      for (
        let x = Math.max(0, Math.floor(z.x - z.r));
        x <= Math.min(N - 1, Math.ceil(z.x + z.r));
        x++
      ) {
        const d2 =
          (x - z.x) * (x - z.x) +
          (y - z.y) * (y - z.y);

        if (
          d2 > z.r * z.r ||
          (z.r0 > 0 && d2 <= z.r0 * z.r0)
        ) {
          continue;
        }

        const i = ix(x, y);
        const t = trl[i];

        if (t && t !== z.o) {
          const v = ents[t - 1];
          const k = v.trail.indexOf(i);

          if (k >= 0) {
            cut(v, k, o);
          }
        }

        if (own[i] !== z.o && !trl[i]) {
          so(i, z.o);
        }
      }
    }
  }

  function needsReclaim(t) {
    let n = 0;

    for (let y = Math.max(0, t.y - t.r); y <= Math.min(N - 1, t.y + t.r); y++) {
      for (let x = Math.max(0, t.x - t.r); x <= Math.min(N - 1, t.x + t.r); x++) {
        if ((x - t.x) * (x - t.x) + (y - t.y) * (y - t.y) > t.r * t.r) continue;
        if (own[ix(x, y)] !== t.o && ++n >= 3) return true;
      }
    }

    return false;
  }

  function towerCheck() {
    for (const t of towers) {
      if (t.o && !ents[t.o - 1].alive) {
        t.o = 0;
      }

      let o = -1;
      let ok = true;

      for (let dy = -1; dy <= 1 && ok; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;

          const v = own[ix(t.x + dx, t.y + dy)];

          if (!v) {
            ok = false;
            break;
          }

          if (o < 0) {
            o = v;
          } else if (v !== o) {
            ok = false;
            break;
          }
        }
      }

      if (ok && o > 0 && o !== t.o) {
        const e = ents[o - 1];

        if (!e.alive) continue;

        t.o = o;
        t.wv = { r: 0, o };

        pop(t.x, t.y, 'TOWER CLAIMED', '#fff');
        say(e.name + ' claimed a tower');
      }
    }
  }

  function step(e) {
    if (e.bot) {
      ai(e);
    } else if (e.q !== null) {
      const d = D[e.q];

      if (!(d[0] === -e.dx && d[1] === -e.dy)) {
        e.dx = d[0];
        e.dy = d[1];
      }

      e.q = null;
    }

    let nx = e.x + e.dx;
    let ny = e.y + e.dy;

    if (nx < 0 || ny < 0 || nx >= N || ny >= N) {
      const c = [
        [-e.dy, e.dx],
        [e.dy, -e.dx]
      ].filter(d => {
        const x = e.x + d[0];
        const y = e.y + d[1];

        return x >= 0 && y >= 0 && x < N && y < N;
      });

      const free = c.filter(
        d => !blocked(e, d[0], d[1])
      );

      const pick = free.length ? free : c;
      const d = pick[Math.random() * pick.length | 0];

      e.dx = d[0];
      e.dy = d[1];

      nx = e.x + e.dx;
      ny = e.y + e.dy;
    }

    const ci = ix(e.x, e.y);

    if (own[ci] !== e.id && !trl[ci]) {
      st(ci, e.id);
      e.trail.push(ci);
    }

    const i = ix(nx, ny);
    const tv = trl[i];

    if (tv) {
      const v = ents[tv - 1];
      const k = v.trail.indexOf(i);

      if (k >= 0) {
        cut(v, k, e);
      }

      if (!e.alive) return;
    }

    e.x = nx;
    e.y = ny;

    if (own[i] === e.id && e.trail.length) {
      capture(e);
    }

    for (let k = pu.length - 1; k >= 0; k--) {
      const p = pu[k];

      if (p.x === nx && p.y === ny) {
        if (p.type === 0) {
          e.boost = 6;
          pop(nx, ny, 'SPEED', '#ffd400');
        } else {
          e.shield = 1;
          pop(nx, ny, 'SHIELD', '#00f0ff');
        }

        pu.splice(k, 1);
      }
    }
  }

  function update(dt) {
    for (const e of ents) {
      if (!e.alive) {
        if (e.bot && (e.respawn -= dt) <= 0) {
          spawn(e);
        }
        continue;
      }

      if (e.boost > 0) {
        e.boost -= dt;
      }

      if (e.fuse) {
        e.fuseAcc += dt;

        while (e.fuseAcc >= .05 && e.fuse) {
          e.fuseAcc -= .05;

          if (e.trail.length) {
            st(e.trail.shift(), 0);
          } else {
            const k = e.fuse;
            e.fuse = null;
            die(e, k);
          }
        }

        if (!e.alive) continue;
      }

      if (e.stopped) {
        e.acc = 0;
        continue;
      }

      e.acc += dt * (e.boost > 0 ? 1.6 : 1) * (e.bot ? .9 : 1);

      while (e.acc >= STEP && e.alive) {
        e.acc -= STEP;
        step(e);
      }
    }

    puT += dt;

    if (puT > 2.2) {
      puT = 0;

      if (pu.length < 10) {
        const x = Math.random() * N | 0;
        const y = Math.random() * N | 0;

        if (!trl[ix(x, y)]) {
          pu.push({
            x,
            y,
            type: Math.random() < .55 ? 0 : 1
          });
        }
      }
    }

    towerCheck();

    // Owned towers reclaim land inside their radius.
    for (const t of towers) {
      if (!t.o || t.wv || !ents[t.o - 1].alive || !needsReclaim(t)) {
        t.cd = 0;
        continue;
      }

      t.cd = (t.cd || 0) + dt;

      if (t.cd >= TOWER_PULSE) {
        t.cd = 0;
        t.wv = { r: 0, o: t.o };
        pop(t.x, t.y, 'RECLAIM', COLORS[t.o - 1]);
      }
    }

    for (const t of towers) {
      const w = t.wv;
      if (!w) continue;

      if (!ents[w.o - 1].alive || t.o !== w.o) {
        t.wv = null;
        continue;
      }

      const r1 = Math.min(t.r, w.r + dt * 14);

      wave({
        x: t.x,
        y: t.y,
        r: r1,
        r0: w.r,
        o: w.o
      });

      w.r = r1;

      if (r1 >= t.r) {
        t.wv = null;
      }
    }

    arT += dt;

    if (arT > .25) {
      arT = 0;

      const c = new Array(SLOTS + 1).fill(0);

      for (let i = 0; i < N * N; i++) {
        if (own[i]) c[own[i]]++;
      }

      for (const e of ents) {
        e.area = c[e.id] / (N * N) * 100;

        if (e.alive && e.area === 0 && !e.trail.length) {
          die(e, null);
        }
      }
    }
  }

  function broadcast() {
    const d = [];

    for (const i of dirty) {
      d.push(i, own[i], trl[i]);
    }

    dirty.clear();

    const msg = JSON.stringify({
      t: 's',

      e: ents.map(e => ({
        i: e.id,
        x: e.x,
        y: e.y,
        dx: e.dx,
        dy: e.dy,
        a: e.alive ? 1 : 0,
        b: e.boost > 0 ? 1 : 0,
        s: e.shield,
        f: e.fuse ? 1 : 0,
        k: e.kills,
        r: Math.round(e.area * 10),
        n: e.name,
        h: e.ws ? 1 : 0,
        z: e.stopped ? 1 : 0
      })),

      d,
      pu,

      tw: towers.map(t => ({
        x: t.x,
        y: t.y,
        r: t.r,
        o: t.o,
        w: t.wv ? t.wv.r : -1,
        wo: t.wv ? t.wv.o : 0,
        c: t.o && t.cd ? Math.min(1, t.cd / TOWER_PULSE) : 0
      })),

      ev
    });

    ev = [];

    for (const e of ents) {
      if (e.ws && e.ws.readyState === 1) {
        e.ws.send(msg);
      }
    }
  }

  const humans = () => ents.filter(e => e.ws).length;

  function loop() {
    const now = Date.now();
    const dt = Math.min(.1, (now - last) / 1000);
    last = now;

    update(dt);
    broadcast();
  }

  function start() {
    clearTimeout(emptyTimer);

    if (!timer) {
      last = Date.now();
      timer = setInterval(loop, TICK);
    }
  }

  function stop() {
    clearInterval(timer);
    timer = null;

    emptyTimer = setTimeout(() => {
      if (!humans()) onEmpty(code);
    }, 600000);
  }

  return {
    code,
    pub: false,

    open: () => ents.some(e => e.bot),

    join(ws, name, sid) {
      sid = typeof sid === 'string' && /^[\w-]{8,40}$/.test(sid) ? sid : '';

      let e = null;

      // Same player returning.
      if (sid) {
        e = ents.find(x => x.sid === sid && (x.bot || x.ws));

        if (e && e.ws && e.ws !== ws) {
          const old = e.ws;
          old.ent = null;
          old.game = null;
          send(old, { t: 'kicked' });
          try { old.close(); } catch (err) {}
          e.ws = null;
        }
      }

      const reclaimed = !!e;

      // Take over a bot.
      if (!e) {
        const now = Date.now();

        e =
          ents.find(x => x.bot && !x.alive && !(x.hold > now)) ||
          ents.find(x => x.bot && !(x.hold > now)) ||
          ents.find(x => x.bot && !x.alive) ||
          ents.find(x => x.bot);
      }

      if (!e) return false;

      if (!reclaimed && e.alive) {
        clear(e);
      }

      e.bot = false;
      e.ws = ws;
      e.sid = sid;
      e.hold = 0;
      e.q = null;
      e.name = clean(name);

      if (!reclaimed) {
        e.kills = 0;
        e.area = 0;
        spawn(e);
      } else if (!e.alive) {
        e.kills = 0;
        spawn(e);
      }

      ws.ent = e;
      ws.game = this;

      send(ws, {
        t: 'init',
        id: e.id,
        room: code,
        own: Buffer.from(
          own.buffer,
          own.byteOffset,
          own.length
        ).toString('base64'),
        trl: Buffer.from(
          trl.buffer,
          trl.byteOffset,
          trl.length
        ).toString('base64')
      });

      start();
      return true;
    },

    play(e, name) {
      if (!e.alive) {
        e.name = clean(name);
        e.kills = 0;
        spawn(e);
      }

      send(e.ws, {
        t: 'init',
        id: e.id,
        room: code,
        own: Buffer.from(
          own.buffer,
          own.byteOffset,
          own.length
        ).toString('base64'),
        trl: Buffer.from(
          trl.buffer,
          trl.byteOffset,
          trl.length
        ).toString('base64')
      });
    },

    dir(e, d) {
      if (!e.alive || !(d >= 0 && d < 4)) return;

      d = d | 0;
      const nd = D[d];

      // Stopped: resume in a valid direction.
      if (e.stopped) {
        const x = e.x + nd[0];
        const y = e.y + nd[1];

        if (x >= 0 && y >= 0 && x < N && y < N && trl[ix(x, y)] === e.id) {
          return;
        }

        e.dx = nd[0];
        e.dy = nd[1];
        e.q = null;
        e.stopped = false;
        e.acc = STEP;
        return;
      }

      // Opposite direction stops player.
      const hd = e.q !== null ? D[e.q] : [e.dx, e.dy];

      if (nd[0] === -hd[0] && nd[1] === -hd[1]) {
        if (e.q !== null) {
          e.dx = hd[0];
          e.dy = hd[1];
          e.q = null;
        }

        e.stopped = true;
        return;
      }

      e.q = d;
    },

    // Stop / go toggle.
    stop(e) {
      if (!e.alive) return;

      if (e.stopped) {
        e.stopped = false;
        e.acc = STEP;
        return;
      }

      if (e.q !== null) {
        e.dx = D[e.q][0];
        e.dy = D[e.q][1];
        e.q = null;
      }

      e.stopped = true;
    },

    leave(ws) {
      const e = ws.ent;
      if (!e) return;

      e.ws = null;
      e.bot = true;
      e.hold = Date.now() + 60000;

      // Give returning bot a fresh identity.
      e.name = botName(e);

      if (!e.alive) {
        e.respawn = 3;
      }

      ws.ent = null;

      if (!humans()) {
        stop();
      }
    }
  };
}

// ====== ROOMS ======
const rooms = new Map();
let pc = 0;

const drop = c => rooms.delete(c);

function pick(code, rejoin) {
  if (code && /^[A-Za-z0-9_-]{1,16}$/.test(code)) {
    let g = rooms.get(code);

    if (!g) {
      if (rejoin) return pick('');

      g = Game(code, drop);
      rooms.set(code, g);
    }

    if (g.open()) return g;

    return rejoin ? pick('') : null;
  }

  for (const g of rooms.values()) {
    if (g.pub && g.open()) return g;
  }

  const g = Game('p' + (++pc), drop);
  g.pub = true;
  rooms.set(g.code, g);

  return g;
}

// ====== HTTP AND WEBSOCKET SERVER ======
const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end('TileSnake.io is Online (Check Cloudflare)');
});

const wss = new WebSocketServer({
  server,
  maxPayload: 512
});

wss.on('connection', ws => {
  if (ws._socket) ws._socket.setNoDelay(true);

  ws.on('message', raw => {
    let m;

    try {
      m = JSON.parse(raw);
    } catch {
      return;
    }

    if (m.t === 'join') {
      if (ws.game && ws.ent) {
        ws.game.play(ws.ent, m.name);
        return;
      }

      const g = pick(m.room, m.rejoin === true);

      if (!g || !g.join(ws, m.name, m.sid)) {
        send(ws, { t: 'full' });
      }

    } else if (m.t === 'dir' && ws.game && ws.ent) {
      ws.game.dir(ws.ent, m.d);
    } else if (m.t === 'stop' && ws.game && ws.ent) {
      ws.game.stop(ws.ent);
    }
  });

  ws.on('close', () => {
    if (ws.game) {
      ws.game.leave(ws);
    }
  });

  ws.on('error', () => {});
});

const PORT = process.env.PORT || 8080;

server.listen(PORT, () => {
  console.log('TileSnake.io server on :' + PORT);
});
