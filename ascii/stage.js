/* ASCII stage — one full-viewport canvas drawn from a cell buffer.
   Every object (tower, funnel, cylinder, telescreen) writes characters into a Buf.
   Scene transitions are cell-by-cell substitutions between two Bufs.

   Rendering: WebGL2 glyph atlas (one draw call, any number of cells, per-cell ink level for gray tones).
   Falls back to a plain 2D canvas when WebGL2 is not available. */
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
      this.lvl = new Uint8Array(n); // ink level 0..255 (gray tone of the character)
      this.clear(false);
    }
    clear(dark) {
      this.ch.fill(32);
      this.tone.fill(0);
      this.dark.fill(dark ? 1 : 0);
      this.lvl.fill(255);
    }
    set(x, y, code, tone, lvl) {
      x = Math.floor(x);
      y = Math.floor(y);
      if (x < 0 || y < 0 || x >= this.c || y >= this.r) return;
      const i = y * this.c + x;
      this.ch[i] = code;
      this.tone[i] = tone || 0;
      this.lvl[i] = lvl === undefined ? 255 : lvl;
    }
    text(x, y, str, tone, lvl) {
      let cx = x;
      for (const chr of String(str)) {
        const code = chr.codePointAt(0);
        if (code > 0xfffe) continue;
        if (isWide(code)) {
          this.set(cx, y, code, tone, lvl);
          this.set(cx + 1, y, CONT, tone, lvl);
          cx += 2;
        } else {
          this.set(cx, y, code, tone, lvl);
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
          this.lvl[i] = 255;
        }
      }
    }
    copyCell(src, i) {
      this.ch[i] = src.ch[i];
      this.tone[i] = src.tone[i];
      this.dark[i] = src.dark[i];
      this.lvl[i] = src.lvl[i];
    }
  }

  function textWidth(str) {
    let w = 0;
    for (const chr of String(str)) w += isWide(chr.codePointAt(0)) ? 2 : 1;
    return w;
  }

  const VERT = `#version 300 es
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

  const FRAG = `#version 300 es
precision highp float;
uniform sampler2D uCells;
uniform sampler2D uAtlas;
uniform vec2 uGrid;
uniform vec2 uCellPx;
uniform float uHeight;
uniform vec2 uAtlasGrid;
out vec4 o;
void main() {
  vec2 px = vec2(gl_FragCoord.x, uHeight - gl_FragCoord.y);
  vec2 cell = px / uCellPx;
  vec2 ci = clamp(floor(cell), vec2(0.0), uGrid - 1.0);
  vec2 f = clamp(cell - ci, 0.0, 1.0);
  vec4 d = texelFetch(uCells, ivec2(ci), 0) * 255.0;
  float slot = floor(d.r + 0.5) + floor(d.g + 0.5) * 256.0;
  float fl = floor(d.b + 0.5);
  float dark = mod(fl, 2.0);
  float red = floor(fl / 2.0);
  float lvl = d.a / 255.0;
  vec2 sp = vec2(mod(slot, uAtlasGrid.x), floor(slot / uAtlasGrid.x));
  float a = texture(uAtlas, (sp + f) / uAtlasGrid).a;
  vec3 bg = dark > 0.5 ? vec3(0.0) : vec3(1.0);
  vec3 ink = red > 0.5 ? vec3(0.89, 0.024, 0.075) : (dark > 0.5 ? vec3(1.0) : vec3(0.0));
  o = vec4(mix(bg, ink, a * lvl), 1.0);
}`;

  const Stage = {
    canvas: null,
    ctx: null,
    gl: null,
    mode: "2d",
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
    measure: document.createElement("canvas").getContext("2d"),

    init(canvas) {
      this.canvas = canvas;
      try {
        const gl = canvas.getContext("webgl2", { antialias: false, alpha: false, preserveDrawingBuffer: true });
        if (gl) this.setupGL(gl);
      } catch (err) {
        this.gl = null;
      }
      if (!this.gl) this.ctx = canvas.getContext("2d", { alpha: false });
      this.mode = this.gl ? "webgl2" : "2d";
      this.resize();
    },

    /* ───────── WebGL2 glyph-atlas renderer ───────── */
    setupGL(gl) {
      const sh = (type, src) => {
        const s = gl.createShader(type);
        gl.shaderSource(s, src);
        gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
        return s;
      };
      const prog = gl.createProgram();
      gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
      gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
      this.gl = gl;
      this.prog = prog;
      this.u = {};
      ["uCells", "uAtlas", "uGrid", "uCellPx", "uHeight", "uAtlasGrid"].forEach((n) => (this.u[n] = gl.getUniformLocation(prog, n)));
      this.cellsTex = gl.createTexture();
      this.atlasTex = gl.createTexture();
      this.atlasCanvas = document.createElement("canvas");
      this.atlasCtx = this.atlasCanvas.getContext("2d");
      this.slotMap = new Map();
      this.cellData = null;
    },

    buildAtlas() {
      const SS = 2;
      const dpr = this.dpr;
      this.sw = Math.ceil(this.cellW * dpr * SS);
      this.sh = Math.ceil(this.cellH * dpr * SS);
      const gl = this.gl;
      const maxTex = gl.getParameter(gl.MAX_TEXTURE_SIZE);
      let SX = 64;
      while (SX * this.sw > maxTex && SX > 8) SX /= 2;
      const SY = Math.min(Math.floor(maxTex / this.sh), Math.max(16, Math.ceil(2048 / SX)));
      this.SX = SX;
      this.SY = SY;
      this.atlasCanvas.width = SX * this.sw;
      this.atlasCanvas.height = SY * this.sh;
      const a = this.atlasCtx;
      a.clearRect(0, 0, this.atlasCanvas.width, this.atlasCanvas.height);
      a.fillStyle = "#fff";
      a.textBaseline = "alphabetic";
      a.textAlign = "left";
      a.font = this.fs * dpr * SS + 'px "IBM Plex Mono", monospace';
      const base = (this.fs * 0.93 + (this.cellH - this.fs * 1.2) / 2) * dpr * SS;
      for (let code = 32; code < 127; code += 1) {
        const slot = code - 32;
        a.fillText(String.fromCharCode(code), (slot % SX) * this.sw, Math.floor(slot / SX) * this.sh + base);
      }
      this.atlasBase = base;
      this.slotMap = new Map();
      this.nextSlot = 95;
      this.atlasDirty = true;
    },

    glyphSlot(code) {
      let slot = this.slotMap.get(code);
      if (slot !== undefined) return slot;
      const wide = isWide(code);
      if (wide && this.nextSlot % this.SX === this.SX - 1) this.nextSlot += 1;
      slot = this.nextSlot;
      if (slot + (wide ? 2 : 1) > this.SX * this.SY) return 0;
      this.nextSlot += wide ? 2 : 1;
      const a = this.atlasCtx;
      const x = (slot % this.SX) * this.sw;
      const y = Math.floor(slot / this.SX) * this.sh;
      const dpr = this.dpr;
      a.save();
      a.beginPath();
      a.rect(x, y, this.sw * (wide ? 2 : 1), this.sh);
      a.clip();
      a.fillStyle = "#fff";
      a.textBaseline = "alphabetic";
      if (wide) {
        a.font = "600 " + this.fs * 1.12 * dpr * 2 + 'px Pretendard, "Pretendard Variable", sans-serif';
        a.textAlign = "center";
        a.fillText(String.fromCodePoint(code), x + this.sw, y + this.atlasBase);
      } else {
        a.font = this.fs * dpr * 2 + 'px "IBM Plex Mono", monospace';
        a.textAlign = "left";
        a.fillText(String.fromCodePoint(code), x, y + this.atlasBase);
      }
      a.restore();
      this.slotMap.set(code, slot);
      this.atlasDirty = true;
      return slot;
    },

    drawGL(buf) {
      const gl = this.gl;
      const { cols, rows } = this;
      const n = cols * rows;
      if (!this.cellData || this.cellData.length !== n * 4) this.cellData = new Uint8Array(n * 4);
      const d = this.cellData;
      const { ch, tone, dark, lvl } = buf;
      for (let i = 0; i < n; i += 1) {
        const code = ch[i];
        let slot = 0;
        if (code === 32) {
          slot = 0;
        } else if (code === CONT) {
          const left = i % cols > 0 ? ch[i - 1] : 0;
          if (left && isWide(left)) slot = this.glyphSlot(left) + 1;
        } else if (isWide(code)) {
          slot = this.glyphSlot(code);
        } else if (code > 32 && code < 127) {
          slot = code - 32;
        } else {
          slot = this.glyphSlot(code);
        }
        const k = i * 4;
        d[k] = slot & 255;
        d[k + 1] = slot >> 8;
        d[k + 2] = dark[i] | (tone[i] << 1);
        d[k + 3] = lvl[i];
      }
      if (this.atlasDirty) {
        gl.bindTexture(gl.TEXTURE_2D, this.atlasTex);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.atlasCanvas);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        this.atlasDirty = false;
      }
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, this.cellsTex);
      gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, cols, rows, 0, gl.RGBA, gl.UNSIGNED_BYTE, d);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.atlasTex);
      gl.viewport(0, 0, this.canvas.width, this.canvas.height);
      gl.useProgram(this.prog);
      gl.uniform1i(this.u.uAtlas, 0);
      gl.uniform1i(this.u.uCells, 1);
      gl.uniform2f(this.u.uGrid, cols, rows);
      gl.uniform2f(this.u.uCellPx, this.cellW * this.dpr, this.cellH * this.dpr);
      gl.uniform1f(this.u.uHeight, this.canvas.height);
      gl.uniform2f(this.u.uAtlasGrid, this.SX, this.SY);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },

    resize() {
      const W = window.innerWidth;
      const H = window.innerHeight;
      this.dpr = Math.min(window.devicePixelRatio || 1, 2);
      const targetCols = Math.max(64, Math.min(360, Math.round(W / (this.gl ? 5.2 : 6.4))));
      this.fs = Math.max(6, W / (targetCols * 0.6));
      const m = this.measure;
      m.font = this.fs + 'px "IBM Plex Mono", monospace';
      const measured = m.measureText("M").width || this.fs * 0.6;
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
      if (this.gl) this.buildAtlas();
    },

    cellFromClient(clientX, clientY) {
      return { x: clientX / this.cellW, y: clientY / this.cellH };
    },

    draw(buf) {
      if (this.gl) {
        this.drawGL(buf);
        return;
      }
      this.draw2d(buf);
    },

    /* ───────── fallback: 2D canvas ───────── */
    draw2d(buf) {
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
        ctx.font = "600 " + fs * 1.12 + 'px Pretendard, "Pretendard Variable", sans-serif';
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
