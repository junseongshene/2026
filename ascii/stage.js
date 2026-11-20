/* ASCII stage — one full-viewport canvas drawn from a cell buffer.
   Every object (tower, funnel, cylinder, telescreen) writes characters into a Buf.
   Scene transitions are cell-by-cell substitutions between two Bufs. */
(() => {
  const CONT = 0xffff; // right half of a double-width glyph
  const isWide = (c) => (c >= 0x1100 && c < 0x1200) || c >= 0x2e80;

  function hash(a, b, c) {
    let h = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263) + Math.imul((c || 0) | 0, 2147483647)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }

  class Buf {
    constructor() {
      this.c = 0;
      this.r = 0;
    }
    resize(c, r) {
      this.c = c;
      this.r = r;
      const n = c * r;
      this.ch = new Uint16Array(n);
      this.tone = new Uint8Array(n);
      this.dark = new Uint8Array(n);
      this.clear(false);
    }
    clear(dark) {
      this.ch.fill(32);
      this.tone.fill(0);
      this.dark.fill(dark ? 1 : 0);
    }
    set(x, y, code, tone) {
      x = Math.floor(x);
      y = Math.floor(y);
      if (x < 0 || y < 0 || x >= this.c || y >= this.r) return;
      const i = y * this.c + x;
      this.ch[i] = code;
      this.tone[i] = tone || 0;
    }
    text(x, y, str, tone) {
      let cx = x;
      for (const chr of String(str)) {
        const code = chr.codePointAt(0);
        if (code > 0xfffe) continue;
        if (isWide(code)) {
          this.set(cx, y, code, tone);
          this.set(cx + 1, y, CONT, tone);
          cx += 2;
        } else {
          this.set(cx, y, code, tone);
          cx += 1;
        }
      }
      return cx;
    }
    blank(x0, y0, x1, y1) {
      for (let y = Math.max(0, Math.floor(y0)); y < Math.min(this.r, Math.ceil(y1)); y += 1) {
        for (let x = Math.max(0, Math.floor(x0)); x < Math.min(this.c, Math.ceil(x1)); x += 1) {
          const i = y * this.c + x;
          this.ch[i] = 32;
          this.tone[i] = 0;
        }
      }
    }
    copyCell(src, i) {
      this.ch[i] = src.ch[i];
      this.tone[i] = src.tone[i];
      this.dark[i] = src.dark[i];
    }
  }

  function textWidth(str) {
    let w = 0;
    for (const chr of String(str)) w += isWide(chr.codePointAt(0)) ? 2 : 1;
    return w;
  }

  const Stage = {
    canvas: null,
    ctx: null,
    cols: 0,
    rows: 0,
    cellW: 6,
    cellH: 12,
    fs: 10,
    dpr: 1,
    aspect: 2,
    A: new Buf(),
    B: new Buf(),
    C: new Buf(),
    O: new Buf(),
    ptr: { x: 0, y: 0, active: false },

    init(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d", { alpha: false });
      this.resize();
    },

    resize() {
      const W = window.innerWidth;
      const H = window.innerHeight;
      this.dpr = Math.min(window.devicePixelRatio || 1, 2);
      const targetCols = Math.max(64, Math.min(300, Math.round(W / 6.4)));
      this.fs = Math.max(7, W / (targetCols * 0.6));
      const ctx = this.ctx;
      ctx.font = this.fs + 'px "IBM Plex Mono", monospace';
      const measured = ctx.measureText("M").width || this.fs * 0.6;
      this.cellW = measured;
      this.cellH = Math.round(this.fs * 1.2 * this.dpr) / this.dpr;
      this.cols = Math.ceil(W / this.cellW);
      this.rows = Math.ceil(H / this.cellH);
      this.aspect = this.cellH / this.cellW;
      this.canvas.width = Math.floor(W * this.dpr);
      this.canvas.height = Math.floor(H * this.dpr);
      this.canvas.style.width = W + "px";
      this.canvas.style.height = H + "px";
      [this.A, this.B, this.C, this.O].forEach((b) => b.resize(this.cols, this.rows));
    },

    cellFromClient(clientX, clientY) {
      return { x: clientX / this.cellW, y: clientY / this.cellH };
    },

    draw(buf) {
      const { ctx, cols, rows, cellW, cellH, fs, dpr } = this;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.textBaseline = "alphabetic";
      ctx.textAlign = "left";
      ctx.font = fs + 'px "IBM Plex Mono", monospace';
      const base = fs * 0.93 + (cellH - fs * 1.2) / 2;
      const wides = [];
      for (let y = 0; y < rows; y += 1) {
        const row = y * cols;
        let x = 0;
        while (x < cols) {
          const key = (buf.dark[row + x] << 1) | buf.tone[row + x];
          let x2 = x + 1;
          while (x2 < cols && ((buf.dark[row + x2] << 1) | buf.tone[row + x2]) === key) x2 += 1;
          const dark = key >> 1;
          const red = key & 1;
          const px = Math.floor(x * cellW);
          const pw = Math.ceil((x2 - x) * cellW) + 1;
          const py = Math.round(y * cellH);
          ctx.fillStyle = dark ? "#000" : "#fff";
          ctx.fillRect(px, py, pw, Math.ceil(cellH) + 1);
          let s = "";
          let any = false;
          for (let k = x; k < x2; k += 1) {
            const code = buf.ch[row + k];
            if (code === 32 || code === CONT) {
              s += " ";
            } else if (isWide(code)) {
              s += " ";
              wides.push(k, y, code, key);
            } else {
              s += String.fromCharCode(code);
              any = true;
            }
          }
          if (any) {
            ctx.fillStyle = red ? "#e30613" : dark ? "#fff" : "#000";
            ctx.fillText(s, x * cellW, y * cellH + base);
          }
          x = x2;
        }
      }
      if (wides.length) {
        ctx.font = '600 ' + fs * 1.12 + 'px Pretendard, "Pretendard Variable", sans-serif';
        ctx.textAlign = "center";
        for (let i = 0; i < wides.length; i += 4) {
          const key = wides[i + 3];
          const red = key & 1;
          const dark = key >> 1;
          ctx.fillStyle = red ? "#e30613" : dark ? "#fff" : "#000";
          ctx.fillText(String.fromCharCode(wides[i + 2]), (wides[i] + 1) * cellW, wides[i + 1] * cellH + base);
        }
      }
    },
  };

  window.ASCII = { Stage, Buf, hash, CONT, isWide, textWidth };
})();
