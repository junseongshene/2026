/* ASCII objects — each draws into a Buf.
   tower (S1) · rulers/ledger (S2,S3) · funnel (S2→S3) · cylinder (S4) · telescreen (S5) */
(() => {
  const { Stage, hash, CONT, isWide, textWidth } = window.ASCII;
  const TAU = Math.PI * 2;
  const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
  const ch = (s) => s.charCodeAt(0);
  const ready3d = () => !!(window.ASCII3D && window.ASCII3D.ready);

  /* ───────── HUD vocabulary: brackets, leaders, readouts ───────── */
  function bracket(buf, x0, y0, x1, y1, len) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const L = len || 5;
    [[x0, y0, 1, 1], [x1, y0, -1, 1], [x0, y1, 1, -1], [x1, y1, -1, -1]].forEach(([x, y, sx, sy]) => {
      buf.set(x, y, ch("+"), 0);
      for (let i = 1; i <= L; i += 1) {
        buf.set(x + sx * i, y, ch("-"), 0);
        buf.set(x, y + sy * Math.ceil(i / 2), ch("|"), 0);
      }
    });
  }

  function leader(buf, x0, y0, x1, y1) {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const steps = Math.max(Math.abs(dx), Math.abs(dy), 1);
    for (let s = 0; s <= steps; s += 1) {
      const x = x0 + (dx * s) / steps;
      const y = y0 + (dy * s) / steps;
      const flat = Math.abs(dy) * 2 < Math.abs(dx);
      const code = s === 0 ? ch("o") : s === steps ? ch("+") : flat ? ch("-") : dx * dy > 0 ? 92 : 47;
      buf.set(Math.round(x), Math.round(y), code, 0);
    }
  }

  /* ───────── FIGlet fonts (external asset, parsed at runtime) ───────── */
  function parseFlf(text) {
    const lines = text.split(/\r?\n/);
    const head = lines[0].split(" ");
    const hard = head[0][5];
    const height = parseInt(head[1], 10);
    const skip = parseInt(head[5], 10);
    const glyph = {};
    let i = 1 + skip;
    for (let code = 32; code < 127; code += 1) {
      const rows = [];
      for (let r = 0; r < height; r += 1) rows.push((lines[i + r] || "").replace(/@+$/, "").split(hard).join(" "));
      glyph[code] = rows;
      i += height;
    }
    return { height, glyph };
  }

  function bigLines(font, str) {
    if (!font) return [];
    const out = [];
    for (let r = 0; r < font.height; r += 1) {
      let line = "";
      for (const c of str.toUpperCase()) line += (font.glyph[c.charCodeAt(0)] || font.glyph[63])[r];
      out.push(line.replace(/\s+$/, ""));
    }
    return out;
  }

  /* ───────── eye (procedural, resolution independent) ───────── */
  function drawEye(buf, cx, cy, hw, hh, lookX, lookY, open) {
    const aspect = Stage.aspect;
    const x0 = Math.floor(cx - hw - 1);
    const x1 = Math.ceil(cx + hw + 1);
    const y0 = Math.floor(cy - hh - 1);
    const y1 = Math.ceil(cy + hh + 1);
    const irisR = hh * aspect * 0.8 * Math.max(open, 0.25);
    const ox = lookX * hw * 0.38;
    const oy = lookY * hh * aspect * 0.32;
    const IRIS = "%&8O0o";
    for (let y = y0; y <= y1; y += 1) {
      for (let x = x0; x <= x1; x += 1) {
        const nx = (x + 0.5 - cx) / hw;
        const ny = (y + 0.5 - cy) / hh;
        const f = 1 - nx * nx;
        if (f <= 0) continue;
        const lim = Math.pow(f, 0.75) * open;
        const d = Math.abs(ny);
        if (d > lim) continue;
        if (d > lim - 0.2 || lim < 0.12) {
          buf.set(x, y, ch("#"), 0);
          continue;
        }
        const px = x + 0.5 - cx;
        const py = (y + 0.5 - cy) * aspect;
        const dist = Math.hypot(px - ox, py - oy);
        if (dist < irisR * 0.36) {
          buf.set(x, y, ch("@"), 0);
        } else if (dist < irisR) {
          buf.set(x, y, IRIS.charCodeAt(Math.floor(hash(x, y, 3) * IRIS.length)), 0);
        } else if (hash(x, y, 9) < 0.05) {
          buf.set(x, y, ch("."), 0);
        } else {
          buf.set(x, y, 32, 0);
        }
      }
    }
  }

  /* little CCTV glyph  (o)  with gaze */
  function drawCam(buf, x, y, ptr) {
    const dx = ptr.x - x;
    const g = dx < -6 ? 0 : dx > 6 ? 2 : 1;
    const s = ["(o  )", "( o )", "(  o)"][g];
    buf.text(x, y, s, 0);
  }

  /* ───────── rulers (the visible swiss grid) ───────── */
  function ruler(buf, cols, rowTop) {
    for (let x = 0; x < cols; x += 1) buf.set(x, rowTop, ch("-"), 0);
    for (let i = 0; i <= 12; i += 1) {
      const x = Math.min(cols - 1, Math.round((i * cols) / 12));
      buf.set(x, rowTop, ch("+"), 0);
      if (i < 12) buf.text(x + 1, rowTop - 1, String(i + 1).padStart(2, "0"), 0);
    }
  }

  /* ───────── S1 tower: tunnel looking up a panopticon shaft ───────── */
  const BAND = "BIG BROTHER IS WATCHING YOU   ";
  const WIN = {
    top: ".-----.",
    mid: ["|(o  )|", "|( o )|", "|(  o)|"],
    alert: "|(@@@)|",
    bot: "'-----'",
  };

  function tower(buf, c) {
    const { cols, rows, aspect, ptr, t, p } = c;
    buf.clear(true);
    const cx = cols / 2;
    const cy = rows / 2;
    const NU = 48;
    const tileH = 0.118;
    const K = cols * 0.17;
    const TOP = 40;
    const rem = 15.6 * Math.pow(1 - p, 1.8) + 0.36;
    const camY = TOP - rem;
    const rot = t * 0.006 + p * 0.35;
    const rTop = K / rem;
    for (let y = 0; y < rows; y += 1) {
      for (let x = 0; x < cols; x += 1) {
        const dx = x + 0.5 - cx;
        const dy = (y + 0.5 - cy) * aspect;
        const r = Math.hypot(dx, dy);
        if (r < rTop) continue;
        const z = K / r;
        const H = camY + z;
        const th = Math.atan2(dy, dx);
        const u = (th / TAU + rot) * NU;
        const iu = Math.floor(u);
        const fu = u - iu;
        const v = H / tileH;
        const iv = Math.floor(v);
        const fv = v - iv;
        const sw = (r * TAU) / NU;
        const band = iv % 4 === 0;
        const open = hash(iu, iv, 1) < 0.86;
        if (sw < 2.4) {
          // far field: density only
          let code = 46;
          if (band) code = ch("=");
          else if (open) code = hash(x, y, Math.floor(t)) < 0.5 ? ch("+") : ch(":");
          else code = ch("|");
          if (sw < 0.9 && hash(x, y, 5) < 0.55) continue;
          buf.set(x, y, code, 0);
          continue;
        }
        const gx = Math.min(6, Math.floor(fu * 7));
        const gy = Math.min(2, Math.floor(fv * 3));
        if (band) {
          if (gy === 1) {
            const idx = (Math.floor(u * 7) + iv * 5) % BAND.length;
            buf.set(x, y, BAND.charCodeAt((idx + BAND.length) % BAND.length), 0);
          } else if (gy === 0 && gx % 2 === 0) {
            buf.set(x, y, ch("="), 0);
          }
          continue;
        }
        if (!open) {
          if (gy === 1) buf.set(x, y, ch("|"), 0);
          continue;
        }
        if (gy === 0) {
          buf.set(x, y, WIN.top.charCodeAt(gx), 0);
        } else if (gy === 2) {
          buf.set(x, y, WIN.bot.charCodeAt(gx), 0);
        } else {
          // gaze: forward project the tile centre
          const thc = ((iu + 0.5) / NU - rot) * TAU;
          const zc = (iv + 0.5) * tileH - camY;
          let variant = 1;
          if (zc > 0.2) {
            const rc = K / zc;
            const sx = cx + rc * Math.cos(thc);
            const d = ptr.x - sx;
            variant = d < -5 ? 0 : d > 5 ? 2 : 1;
          }
          const alert = hash(iu, iv, Math.floor(t * 0.5)) < 0.025;
          const glyph = alert ? WIN.alert : WIN.mid[variant];
          buf.set(x, y, glyph.charCodeAt(gx), 0);
        }
      }
    }
    // the eye at the top of the shaft
    const hw = Math.min(rTop * 0.96, cols * 0.48);
    const hh = Math.max(1.2, (hw / aspect) * 0.62);
    const lookX = clamp((ptr.x - cx) / cx, -1, 1);
    const lookY = clamp((ptr.y - cy) / cy, -1, 1);
    const openAmt = p > 0.9 ? 1 : 0.55 + 0.45 * Math.min(1, p / 0.9);
    if (ready3d() && hw >= 9) {
      const w = Math.min(Math.floor(cols * 0.8), Math.ceil(hw * 2.1));
      const h = Math.min(rows, Math.ceil(w / aspect) + 2);
      const rect = { x: Math.round(cx - w / 2), y: Math.round(cy - h / 2), w, h };
      const blink = t % 6 > 5.82 ? 0.08 : 1;
      const info = window.ASCII3D.drawEye(buf, rect, { lookX, lookY, open: Math.min(1, openAmt * blink), dark: true });
      if (info && p > 0.45) {
        const bx = info.Wc + 5;
        const by = Math.max(4, info.Hc + 4);
        bracket(buf, info.cx - bx, info.cy - by, info.cx + bx, info.cy + by, 6);
        buf.text(Math.round(info.cx - bx), Math.round(info.cy - by) - 1, "SUBJECT: YOU", 0);
        const g = "GAZE " + String(Math.round(ptr.x)).padStart(3, "0") + "," + String(Math.round(ptr.y)).padStart(3, "0");
        buf.text(Math.round(info.cx + bx) - g.length, Math.round(info.cy + by) + 1, g, 0);
      }
    } else {
      buf.blank(cx - hw - 1, cy - hh - 1, cx + hw + 2, cy + hh + 2);
      drawEye(buf, cx, cy, hw, hh, lookX, lookY, openAmt);
    }
    // text field for the hero copy (swiss cut-out)
    if (c.cutout) {
      const b = c.cutout;
      buf.blank(b.x0, b.y0, b.x1, b.y1);
    }
  }

  /* ───────── S2 backdrop: 2-column newspaper grid + watching cameras ───────── */
  function s2bg(buf, c) {
    const { cols, rows, ptr, p } = c;
    buf.clear(false);
    ruler(buf, cols, 4);
    const mid = Math.round(cols / 2);
    for (let y = 6; y < rows - 4; y += 1) if (y % 2 === 0) buf.set(mid, y, ch(":"), 0);
    // watchers along the bottom edge, one more every few percent
    const n = Math.floor(p * (cols / 5.2));
    for (let i = 0; i < n; i += 1) {
      const x = 1 + i * 6;
      if (x + 5 >= cols) break;
      drawCam(buf, x, rows - 2, ptr);
    }
    drawCam(buf, cols - 7, 6, ptr);
    drawCam(buf, 1, 6, ptr);
    if (ready3d()) {
      const rect = { x: 2, y: Math.round(rows * 0.235), w: Math.round(cols * 0.47), h: Math.round(rows * 0.35) };
      const marks = window.ASCII3D.drawCctv(buf, rect, { n: 1 + p * 7.4, ptr, t: c.t, dark: false });
      marks.forEach((m) => {
        const label = "CAM" + String(m.i + 1).padStart(2, "0");
        buf.text(Math.round(m.x) - 2, Math.round(m.y) + 5, label, 0);
        buf.set(Math.round(m.x) - 3, Math.round(m.y) + 5, Math.floor(c.t * 1.6) % 2 ? ch("*") : 32, 1);
      });
      buf.text(rect.x, rect.y - 1, "SURVEILLANCE NODES: " + Math.round(1 + p * 7.4), 0);
    }
  }

  /* ───────── S3 backdrop: 12-column ledger, pointer trail, scroll sparkline ───────── */
  function s3bg(buf, c) {
    const { cols, rows, trail, speeds } = c;
    buf.clear(false);
    ruler(buf, cols, 4);
    for (let i = 0; i <= 12; i += 1) {
      const x = Math.min(cols - 1, Math.round((i * cols) / 12));
      for (let y = 8; y < rows - 5; y += 6) buf.set(x, y, ch("+"), 0);
    }
    // pointer trail  (the cursor's path, plotted)
    if (trail && trail.length) {
      for (let i = 0; i < trail.length; i += 1) {
        const age = trail.length - 1 - i;
        const code = age < 2 ? "O" : age < 10 ? "o" : age < 30 ? "*" : ".";
        buf.set(trail[i][0], trail[i][1], ch(code), 0);
      }
      const last = trail[trail.length - 1];
      buf.text(Math.max(0, last[0] - 2), last[1], "[ + ]", 0);
      buf.text(Math.min(cols - 14, last[0] + 4), last[1] - 1, "x=" + Math.round(last[0]) + " y=" + Math.round(last[1]), 0);
    }
    // the scanned subject, with leaders to each label
    if (ready3d() && window.ASCII3D.headReady) {
      const rect = { x: Math.round(cols * 0.3), y: Math.round(rows * 0.24), w: Math.round(cols * 0.33), h: Math.round(rows * 0.68) };
      const info = window.ASCII3D.drawHead(buf, rect, {
        lookX: (c.ptr.x / cols - 0.5) * 2,
        lookY: (c.ptr.y / rows - 0.5) * 2,
        spin: Math.sin(c.t * 0.35) * 0.3,
        scan: c.scan == null ? 1 : c.scan,
        dark: false,
      });
      if (info) {
        const sr = Math.round(info.scanRow);
        if (c.scan != null && c.scan < 1) for (let x = rect.x; x < rect.x + rect.w; x += 1) buf.set(x, sr, ch("="), 0);
        const rects = c.labelRects || [];
        rects.forEach((r, i) => {
          const ay = clamp(r.y, rect.y + rect.h * 0.18, rect.y + rect.h * 0.82);
          if (ay <= sr || c.scan == null || c.scan >= 1) leader(buf, rect.x + rect.w * 0.64, ay, r.x - 2, r.y);
        });
        buf.text(rect.x, rect.y + rect.h, "SUBJECT 0001  " + (c.scan != null && c.scan < 1 ? "SCANNING" : "PROFILED"), 0);
      }
    }
    // sparkline of scroll speed
    if (speeds && speeds.length) {
      const RAMP = " .:-=+*#%@";
      const y = rows - 3;
      const x0 = Math.round((cols * 7) / 12);
      const width = Math.min(speeds.length, Math.round((cols * 4.6) / 12));
      buf.text(x0, y - 1, "scroll_speed", 0);
      for (let i = 0; i < width; i += 1) {
        const v = speeds[speeds.length - width + i] || 0;
        const k = Math.min(9, Math.floor(Math.sqrt(Math.min(1, v / 2400)) * 9.99));
        buf.set(x0 + i, y, ch(RAMP[k]), 0);
      }
    }
  }

  /* ───────── funnel / memory hole ───────── */
  function funnelHole(c) {
    return c.cols * 0.03 + Math.pow(c.p, 2) * c.cols * 0.78;
  }

  function funnel(buf, c) {
    const { cols, rows, aspect, t, p, logStr } = c;
    buf.clear(false);
    const cx = cols / 2;
    const cy = rows / 2;
    const ARMS = 7;
    const L = logStr.length;
    const rh = funnelHole(c);
    const spin = t * (0.5 + 3 * p);
    for (let y = 0; y < rows; y += 1) {
      for (let x = 0; x < cols; x += 1) {
        const dx = x + 0.5 - cx;
        const dy = (y + 0.5 - cy) * aspect;
        const r = Math.hypot(dx, dy);
        if (r < rh - 1.5) continue;
        if (r < rh) {
          buf.set(x, y, ch("#"), 0);
          continue;
        }
        const th = Math.atan2(dy, dx);
        const s = (th / TAU) * ARMS + Math.log(r + 2) * 2.1 - spin * 0.35;
        const arm = s - Math.floor(s);
        const near = Math.max(0, 1 - (r - rh) / 90);
        const width = 0.34 + 0.4 * near;
        if (arm > width) {
          if (hash(x, y, 2) < 0.012) buf.set(x, y, ch("."), 0);
          continue;
        }
        const idx = (Math.floor(s) * 53 + Math.floor((r - rh) * 0.9) + Math.floor(spin * 2)) % L;
        buf.set(x, y, logStr.charCodeAt((idx + L) % L), 0);
      }
    }
  }

  /* ───────── S4 cylinder: the feed wall, seen from the inside ───────── */
  const Cylinder = (() => {
    let TW = 600;
    const TH = 96;
    const CW = 30;
    const CH = 9;
    const PX = 32;
    const PY = 10;
    let PER = Math.floor(TW / PX);
    const ROWS = Math.floor(TH / PY); // 10
    let wall = {
      ch: new Uint16Array(TW * TH),
      tone: new Uint8Array(TW * TH),
      dark: new Uint8Array(TW * TH),
    };
    let cards = [];
    let slotOrder = [];
    let slotOf = new Map();
    let hot = -1;
    let dirty = true;
    let lastCount = -1;

    // fill order: centre band first, then spreading sideways, then up/down
    function buildOrder() {
      const j0 = Math.floor(PER / 2);
      const rMid = Math.floor(ROWS / 2);
      const all = [];
      for (let row = 0; row < ROWS; row += 1) {
        for (let j = 0; j < PER; j += 1) {
          let dj = Math.abs(j - j0);
          dj = Math.min(dj, PER - dj);
          all.push({ row, j, key: dj * 1 + Math.abs(row - rMid) * 4.2 + hash(row, j, 7) * 0.6 });
        }
      }
      all.sort((a, b) => a.key - b.key);
      slotOrder = all;
    }
    buildOrder();

    // one texel == one cell at the centre of the view, so text never doubles
    function ensureSize(c) {
      const fov = ((c.cols < 110 ? 58 : 88) * Math.PI) / 180;
      const want = Math.max(300, Math.round(TAU * (c.cols / 2 / Math.tan(fov / 2))));
      if (want === TW) return;
      TW = want;
      PER = Math.floor(TW / PX);
      wall = { ch: new Uint16Array(TW * TH), tone: new Uint8Array(TW * TH), dark: new Uint8Array(TW * TH) };
      buildOrder();
      dirty = true;
    }

    const ICONS = {
      video: [".-------.", "|  |>   |", "'-------'"],
      ad: [".=======.", "| 30%OFF|", "'======='"],
      spam: [".-----.", "| ... |", "'-.---'"],
      notify: ["   _   ", " .' '. ", " '-.-' "],
      news: ["=======", "==  ===", "======="],
    };

    function put(x, y, code, tone, dark) {
      x = ((x % TW) + TW) % TW;
      if (y < 0 || y >= TH) return;
      const i = y * TW + x;
      wall.ch[i] = code;
      wall.tone[i] = tone || 0;
      wall.dark[i] = dark || 0;
    }

    function putText(x, y, str, dark) {
      let cx = x;
      for (const chr of str) {
        const code = chr.codePointAt(0);
        if (code > 0xfffe) continue;
        if (isWide(code)) {
          put(cx, y, code, 0, dark);
          put(cx + 1, y, CONT, 0, dark);
          cx += 2;
        } else {
          put(cx, y, code, 0, dark);
          cx += 1;
        }
      }
    }

    function wrap(str, width, maxLines) {
      const lines = [];
      let cur = "";
      let w = 0;
      for (const chr of str) {
        const cw = isWide(chr.codePointAt(0)) ? 2 : 1;
        if (w + cw > width) {
          lines.push(cur);
          cur = "";
          w = 0;
          if (lines.length >= maxLines) break;
        }
        cur += chr;
        w += cw;
      }
      if (cur && lines.length < maxLines) lines.push(cur);
      return lines;
    }

    function drawCard(card, slot, isHot) {
      const x0 = slot.j * PX + 1;
      const y0 = slot.row * PY + 1;
      const dark = isHot ? 1 : 0;
      for (let y = 0; y < CH; y += 1) for (let x = 0; x < CW; x += 1) put(x0 + x, y0 + y, 32, 0, dark);
      putText(x0, y0, "+" + "-".repeat(CW - 2) + "+", dark);
      putText(x0, y0 + CH - 1, "+" + "-".repeat(CW - 2) + "+", dark);
      for (let y = 1; y < CH - 1; y += 1) {
        put(x0, y0 + y, ch("|"), 0, dark);
        put(x0 + CW - 1, y0 + y, ch("|"), 0, dark);
      }
      const num = "#" + String(card.n).padStart(3, "0");
      putText(x0 + 2, y0 + 1, "[" + card.tag + "]", dark);
      putText(x0 + CW - 2 - num.length, y0 + 1, num, dark);
      const inner = CW - 4;
      const icon = ICONS[card.def.type];
      if (icon && !isHot) icon.forEach((row, k) => putText(x0 + CW - 2 - row.length, y0 + CH - 4 + k, row, dark));
      if (isHot) {
        putText(x0 + 2, y0 + 2, "WHY THIS CARD?", dark);
        const steps = card.why;
        const out = [steps[0], "-> " + steps[1], "-> " + steps[2]];
        let ly = 3;
        out.forEach((s) => {
          wrap(s, inner, 2).forEach((line) => {
            if (ly < CH - 2) putText(x0 + 2, y0 + ly, line, dark);
            ly += 1;
          });
        });
        putText(x0 + 2, y0 + CH - 2, "click = interested (+3)", dark);
      } else {
        const lines = wrap(card.body, inner, 3);
        lines.forEach((line, k) => putText(x0 + 2, y0 + 2 + k, line, dark));
        putText(x0 + 2, y0 + CH - 2, card.sim ? "similar to #" + String(card.from).padStart(3, "0") : "for you", dark);
      }
    }

    function rebuild() {
      wall.ch.fill(32);
      wall.tone.fill(0);
      wall.dark.fill(0);
      slotOf = new Map();
      // ghost grid: the empty wall is still a grid
      for (let row = 0; row < ROWS; row += 1) {
        for (let j = 0; j < PER; j += 1) {
          const x0 = j * PX;
          const y0 = row * PY;
          put(x0, y0, ch("+"), 0, 0);
          put(x0 + PX - 1, y0, ch("+"), 0, 0);
          put(x0, y0 + PY - 1, ch("+"), 0, 0);
          put(x0 + PX - 1, y0 + PY - 1, ch("+"), 0, 0);
        }
      }
      cards.forEach((card, i) => {
        const slot = slotOrder[i];
        if (!slot) return;
        slotOf.set(slot.row * PER + slot.j, i);
        drawCard(card, slot, i === hot);
      });
      dirty = false;
    }

    return {
      TW,
      TH,
      setCards(list) {
        cards = list;
        if (list.length !== lastCount) dirty = true;
        lastCount = list.length;
      },
      setHot(i) {
        if (i !== hot) {
          hot = i;
          dirty = true;
        }
      },
      capacity: () => slotOrder.length,
      map(c, x, y) {
        ensureSize(c);
        const { cols, aspect } = c;
        const fov = ((cols < 110 ? 58 : 88) * Math.PI) / 180;
        const Fc = (cols / 2 / Math.tan(fov / 2)) * c.zoom;
        const dphi = TAU / TW;
        const sx = x + 0.5 - cols / 2;
        const phi = Math.atan(sx / Fc);
        if (Math.abs(phi) > 1.25) return null;
        const cosp = Math.cos(phi);
        const u = phi / dphi + c.rot + TW / 2;
        const row = ((y + 0.5 - c.rows / 2) * cosp) / (Fc * dphi) + TH / 2 + (c.bob || 0);
        return { u: ((Math.floor(u) % TW) + TW) % TW, v: Math.floor(row) };
      },
      pick(c, x, y) {
        const m = this.map(c, x, y);
        if (!m || m.v < 0 || m.v >= TH) return -1;
        const j = Math.floor(m.u / PX);
        const row = Math.floor(m.v / PY);
        const lx = m.u - j * PX;
        const ly = m.v - row * PY;
        if (lx < 1 || lx > CW || ly < 1 || ly > CH) return -1;
        const i = slotOf.get(row * PER + j);
        return i === undefined ? -1 : i;
      },
      draw(buf, c) {
        ensureSize(c);
        if (dirty) rebuild();
        buf.clear(false);
        const { cols, rows } = c;
        const fov = ((cols < 110 ? 58 : 88) * Math.PI) / 180;
        const Fc = (cols / 2 / Math.tan(fov / 2)) * c.zoom;
        const dphi = TAU / TW;
        const cxm = cols / 2;
        const cym = rows / 2;
        const prevWide = new Int32Array(rows).fill(-1);
        for (let x = 0; x < cols; x += 1) {
          const sx = x + 0.5 - cxm;
          const phi = Math.atan(sx / Fc);
          if (Math.abs(phi) > 1.25) continue;
          const cosp = Math.cos(phi);
          const u = Math.floor(phi / dphi + c.rot + TW / 2);
          const uu = ((u % TW) + TW) % TW;
          const k = cosp / (Fc * dphi);
          for (let y = 0; y < rows; y += 1) {
            const v = Math.floor((y + 0.5 - cym) * k + TH / 2 + (c.bob || 0));
            if (v < 0 || v >= TH) continue;
            const wi = v * TW + uu;
            let code = wall.ch[wi];
            const bi = y * cols + x;
            buf.dark[bi] = wall.dark[wi];
            if (code === CONT) continue;
            if (code === 32) {
              prevWide[y] = -1;
              continue;
            }
            if (isWide(code)) {
              if (prevWide[y] === uu) code = CONT;
              else prevWide[y] = uu;
            } else {
              prevWide[y] = -1;
            }
            buf.ch[bi] = code;
            buf.tone[bi] = wall.tone[wi];
          }
        }
        // the edge of the world: a vignette of walls getting too close
        const edge = Math.floor(cols * 0.04);
        for (let y = 0; y < rows; y += 1) {
          for (let e = 0; e < edge; e += 1) {
            if (hash(e, y, 1) < (1 - e / edge) * 0.35) {
              buf.set(e, y, ch("|"), 0);
              buf.set(cols - 1 - e, y, ch("|"), 0);
            }
          }
        }
        // reticle: you are the middle of it
        buf.text(Math.floor(cxm) - 1, Math.floor(cym), "[+]", 0);
      },
    };
  })();

  /* ───────── S5 telescreen ───────── */
  function telescreen(buf, c) {
    const { cols, rows, aspect, ptr, t } = c;
    buf.clear(true);
    const b = clamp(c.b, 0, 1);
    const sx0 = Math.round(cols * 0.035);
    const sx1 = cols - sx0 - 1;
    const sy0 = Math.round(rows * 0.075);
    const sy1 = rows - sy0 - 1;
    // bezel
    for (let x = sx0; x <= sx1; x += 1) {
      buf.set(x, sy0, ch("#"), 0);
      buf.set(x, sy1, ch("#"), 0);
      if (x % 3 === 0) {
        buf.set(x, sy0 - 1, ch("-"), 0);
        buf.set(x, sy1 + 1, ch("-"), 0);
      }
    }
    for (let y = sy0; y <= sy1; y += 1) {
      buf.set(sx0, y, ch("#"), 0);
      buf.set(sx1, y, ch("#"), 0);
    }
    const lines = c.lines;
    const n = lines.length || 1;
    const scroll = Math.floor(t * 2.2);
    const dens = Math.min(1.01, Math.pow(b, 1.25) * 1.05);
    const cx = cols / 2;
    const cy = rows / 2;
    const ehw = cols * 0.215;
    const ehh = rows * 0.17;
    const frame = Math.floor(t * 5);
    for (let y = sy0 + 1; y < sy1; y += 1) {
      const line = lines[(y + scroll) % n] || "";
      const L = line.length || 1;
      for (let x = sx0 + 2; x < sx1 - 1; x += 1) {
        const nx = (x + 0.5 - cx) / (ehw * 1.18);
        const ny = (y + 0.5 - cy) / (ehh * 1.35);
        if (nx * nx + ny * ny < 1) continue;
        if (hash(x, y, frame) >= dens) continue;
        const code = line.charCodeAt((x - sx0 + y * 7) % L);
        if (code > 32 && code < 127) buf.set(x, y, code, 0);
      }
    }
    const lookX = clamp((ptr.x - cx) / cx, -1, 1);
    const lookY = clamp((ptr.y - cy) / cy, -1, 1);
    const open = c.open != null ? c.open : c.dark ? 0.6 + 0.1 * Math.sin(t * 0.8) : 1;
    if (ready3d()) {
      const w = Math.round(cols * 0.5);
      const h = Math.round(rows * 0.5);
      const rect = { x: Math.round(cx - w / 2), y: Math.round(cy - h / 2), w, h };
      const blink = t % 7 > 6.85 ? 0.08 : 1;
      const info = window.ASCII3D.drawEye(buf, rect, { lookX, lookY, open: open * blink, dark: true });
      if (info) {
        const bx = info.Wc + 4;
        const by = Math.max(4, info.Hc + 4);
        bracket(buf, info.cx - bx, info.cy - by, info.cx + bx, info.cy + by, 6);
        const tag = c.tag || "SUBJECT: YOU";
        buf.text(Math.round(info.cx + bx) - tag.length, Math.round(info.cy - by) - 1, tag, 0);
      }
    } else {
      drawEye(buf, cx, cy, ehw, ehh, lookX, lookY, open);
    }
    if (c.bigLines && c.bigLines.length) {
      c.bigLines.forEach((line, i) => buf.text(sx0 + 4, sy0 + 3 + i, line, 0));
    }
  }

  /* ───────── compositing: cell-by-cell substitution ───────── */
  function merge(out, A, B, pick) {
    const { c, r } = out;
    for (let y = 0; y < r; y += 1) {
      for (let x = 0; x < c; x += 1) {
        const i = y * c + x;
        out.copyCell(pick(x, y, i) ? B : A, i);
      }
    }
  }

  window.ASCII.Objects = { parseFlf, bigLines, bracket, leader, drawEye, drawCam, ruler, tower, s2bg, s3bg, funnel, funnelHole, Cylinder, telescreen, merge };
})();
