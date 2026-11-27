/* Motion toolkit — post effects applied to the cell buffer right before drawing.
   Every effect means something: decode = a record being read, sweep = a scan, glitch = the system noticing you,
   vignette = tunnel vision, ripple = a ping from where you clicked. */
(() => {
  const { hash, CONT, isWide } = window.ASCII;
  const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
  const SCRAMBLE = "01<>/\\|=+*#%&@$?!:;";
  const ch = (s) => s.charCodeAt(0);

  const Motion = {
    /* characters resolve from noise to their final glyph; amount 0 → 1 */
    decode(buf, amount, t, seed) {
      if (amount >= 1) return;
      const { c, r } = buf;
      const frame = Math.floor(t * 22);
      for (let y = 0; y < r; y += 1) {
        for (let x = 0; x < c; x += 1) {
          const i = y * c + x;
          const code = buf.ch[i];
          if (code === 32 || code === CONT) continue;
          const h = hash(x, y, seed);
          if (h > amount) {
            if (isWide(code) && x + 1 < c && buf.ch[i + 1] === CONT) buf.ch[i + 1] = 32;
            buf.ch[i] = hash(x, y, frame + seed) < 0.5 ? SCRAMBLE.charCodeAt(Math.floor(hash(x, y, frame * 3) * SCRAMBLE.length)) : 32;
            buf.lvl[i] = 110;
          } else if (h > amount - 0.1) {
            buf.lvl[i] = 255;
          }
        }
      }
    },

    /* a noisy front sweeps across; everything behind it is revealed. dir: 'x' | 'y' */
    sweep(buf, p, dir) {
      if (p >= 1) return;
      const { c, r } = buf;
      const edge = p * 1.2 - 0.1;
      for (let y = 0; y < r; y += 1) {
        for (let x = 0; x < c; x += 1) {
          const i = y * c + x;
          const pos = dir === "y" ? y / r : x / c;
          const v = pos + (hash(x, y, 77) - 0.5) * 0.1;
          if (v > edge) {
            buf.ch[i] = 32;
          } else if (v > edge - 0.04 && buf.ch[i] !== 32) {
            buf.lvl[i] = 255;
          }
        }
      }
    },

    /* rows slip sideways for an instant */
    glitch(buf, t, amount) {
      if (amount <= 0.01) return;
      const { c, r } = buf;
      const frame = Math.floor(t * 18);
      const tmp = { ch: new Uint16Array(c), tone: new Uint8Array(c), dark: new Uint8Array(c), lvl: new Uint8Array(c) };
      for (let y = 0; y < r; y += 1) {
        if (hash(y, frame, 5) > amount * 0.35) continue;
        const dx = Math.round((hash(y, frame, 9) - 0.5) * 2 * (3 + amount * 18));
        if (!dx) continue;
        const row = y * c;
        for (let x = 0; x < c; x += 1) {
          const src = row + ((x - dx + c * 4) % c);
          tmp.ch[x] = buf.ch[src];
          tmp.tone[x] = buf.tone[src];
          tmp.dark[x] = buf.dark[src];
          tmp.lvl[x] = buf.lvl[src];
        }
        for (let x = 0; x < c; x += 1) {
          buf.ch[row + x] = tmp.ch[x];
          buf.tone[row + x] = tmp.tone[x];
          buf.dark[row + x] = tmp.dark[x];
          buf.lvl[row + x] = tmp.lvl[x];
        }
      }
    },

    /* ink fades toward the edges — the eye of the camera */
    vignette(buf, strength) {
      const { c, r } = buf;
      for (let y = 0; y < r; y += 1) {
        const ny = (y + 0.5) / r - 0.5;
        for (let x = 0; x < c; x += 1) {
          const i = y * c + x;
          if (buf.ch[i] === 32) continue;
          const nx = (x + 0.5) / c - 0.5;
          const d = Math.min(1, Math.hypot(nx * 1.15, ny * 1.5) * 1.55);
          const k = 1 - strength * d * d;
          buf.lvl[i] = Math.round(buf.lvl[i] * clamp(k, 0.12, 1));
        }
      }
    },

    /* slow ink flicker, like a signal that is never quite steady */
    shimmer(buf, t, amount) {
      const { c, r } = buf;
      for (let y = 0; y < r; y += 1) {
        for (let x = 0; x < c; x += 1) {
          const i = y * c + x;
          if (buf.ch[i] === 32) continue;
          const n = 0.5 + 0.5 * Math.sin(x * 0.19 + t * 1.6) * Math.sin(y * 0.33 - t * 1.1);
          buf.lvl[i] = Math.round(buf.lvl[i] * (1 - amount * n));
        }
      }
    },

    /* a ring expands from where the visitor clicked */
    ripple(buf, cx, cy, age) {
      if (age < 0 || age > 1.3) return;
      const aspect = window.ASCII.Stage.aspect;
      const radius = age * 70;
      const fade = 1 - age / 1.3;
      const { c, r } = buf;
      const x0 = Math.max(0, Math.floor(cx - radius - 3));
      const x1 = Math.min(c - 1, Math.ceil(cx + radius + 3));
      for (let y = 0; y < r; y += 1) {
        const dy = (y + 0.5 - cy) * aspect;
        if (Math.abs(dy) > radius + 4) continue;
        for (let x = x0; x <= x1; x += 1) {
          const d = Math.hypot(x + 0.5 - cx, dy);
          const k = Math.abs(d - radius);
          if (k < 1.3) {
            const i = y * c + x;
            buf.ch[i] = buf.ch[i] === 32 || hash(x, y, 3) < 0.5 ? ch("*") : buf.ch[i];
            buf.lvl[i] = Math.round(255 * fade);
          }
        }
      }
    },
  };

  window.ASCII.Motion = Motion;
})();
