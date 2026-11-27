/* Video → ASCII. Drop any clip at assets/video/telescreen.mp4 and the telescreen in Scene 5 plays it as characters.
   Brightness decides the character, edges are drawn along the contour, and the same Bayer dither as the 3D objects
   keeps the look consistent. If the file is missing nothing happens. */
(() => {
  const { Stage, hash } = window.ASCII;
  const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
  const RAMP = " .:+*#";
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  const Video = { ready: false, video: null, canvas: document.createElement("canvas"), url: "" };
  const ctx = Video.canvas.getContext("2d", { willReadFrequently: true });

  Video.load = (url) => {
    Video.url = url;
    fetch(url, { method: "HEAD" })
      .then((r) => {
        if (!r.ok) return;
        const v = document.createElement("video");
        v.muted = true;
        v.loop = true;
        v.playsInline = true;
        v.preload = "auto";
        v.src = url;
        v.addEventListener("canplay", () => {
          Video.video = v;
          Video.ready = true;
          v.play().catch(() => {});
        });
      })
      .catch(() => {});
  };

  /* rect in cells; opts: gain 0..1 (brightness), dark (ink is white) */
  Video.draw = (buf, rect, opts) => {
    const v = Video.video;
    if (!Video.ready || !v || v.readyState < 2) return false;
    const w = rect.w;
    const h = rect.h;
    if (Video.canvas.width !== w || Video.canvas.height !== h) {
      Video.canvas.width = w;
      Video.canvas.height = h;
    }
    // cover-fit: crop the source to the physical aspect of the cell rect
    const want = w / (h * Stage.aspect);
    const have = v.videoWidth / v.videoHeight;
    let sx = 0;
    let sy = 0;
    let sw = v.videoWidth;
    let sh = v.videoHeight;
    if (have > want) {
      sw = sh * want;
      sx = (v.videoWidth - sw) / 2;
    } else {
      sh = sw / want;
      sy = (v.videoHeight - sh) / 2;
    }
    ctx.drawImage(v, sx, sy, sw, sh, 0, 0, w, h);
    const px = ctx.getImageData(0, 0, w, h).data;
    const L = new Float32Array(w * h);
    for (let i = 0; i < w * h; i += 1) L[i] = (px[i * 4] * 0.299 + px[i * 4 + 1] * 0.587 + px[i * 4 + 2] * 0.114) / 255;
    const gain = opts.gain === undefined ? 1 : opts.gain;
    const frame = Math.floor(performance.now() / 200);
    for (let y = 0; y < h; y += 1) {
      for (let x = 0; x < w; x += 1) {
        const i = x + y * w;
        const lum = L[i];
        const gx = (x + 1 < w ? L[i + 1] : lum) - (x > 0 ? L[i - 1] : lum);
        const gy = ((y + 1 < h ? L[i + w] : lum) - (y > 0 ? L[i - w] : lum)) * 0.5;
        const m = Math.hypot(gx, gy);
        let code = 0;
        let lvl = 255;
        if (m > 0.2 && lum > 0.08) {
          let psi = (Math.atan2(gy, gx) * 180) / Math.PI + 90;
          psi = ((psi % 180) + 180) % 180;
          code = psi < 22.5 || psi >= 157.5 ? 45 : psi < 67.5 ? 92 : psi < 112.5 ? 124 : 47;
        } else {
          const vv = clamp((lum - 0.08) * 1.5, 0, 1);
          const t = BAYER[(x & 3) + (y & 3) * 4] / 16 - 0.5;
          const idx = clamp(Math.round(vv * 5 + t * 0.9), 0, 5);
          if (idx > 0) {
            code = RAMP.charCodeAt(idx);
            lvl = Math.round(90 + 165 * vv);
          }
        }
        if (!code) continue;
        if (gain < 1 && hash(x, y, frame) > gain) continue;
        buf.set(rect.x + x, rect.y + y, code, 0, Math.round(lvl * (0.35 + 0.65 * gain)));
      }
    }
    return true;
  };

  window.ASCII.Video = Video;
})();
