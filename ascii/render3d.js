/* 3D → ASCII.
   Real 3D shapes (three.js) are rendered twice into a small offscreen target — once lit, once as normals —
   then converted cell by cell:
     · edges (silhouette + creases)  → | - / \  drawn along the contour
     · fills                          → a small 6-step palette  ␣ . : + * #  with ordered (Bayer) dithering
   Nothing is shown on screen from WebGL itself; only characters reach the page.
   Head scan: Lee Perry-Smith, CC BY 3.0 (three.js examples). */
import * as THREE from "three";
import { GLTFLoader } from "../vendor/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "../vendor/jsm/loaders/DRACOLoader.js";

const { Stage } = window.ASCII;
const clamp = (n, a, b) => Math.min(b, Math.max(a, n));

const API = { ready: false, headReady: false, bodyReady: false, camModel: false };
window.ASCII3D = API;

let renderer = null;
try {
  THREE.ColorManagement.enabled = false;
  renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, powerPreference: "high-performance" });
  renderer.localClippingEnabled = true;
  renderer.setPixelRatio(1);
  renderer.setClearColor(0x000000, 0);
} catch (err) {
  renderer = null;
}

if (renderer) {
  const normMat = new THREE.MeshNormalMaterial();
  const RAMP = " .:+*#";
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

  /* ───────── render target (one pair, sub-viewport per call) ───────── */
  let RT = null;
  function ensureRT(W, H) {
    if (RT && RT.W >= W && RT.H >= H) return RT;
    if (RT) {
      RT.lit.dispose();
      RT.norm.dispose();
    }
    const MW = Math.max(W, Stage.cols * 2);
    const MH = Math.max(H, Stage.rows * 4);
    const opt = { format: THREE.RGBAFormat, type: THREE.UnsignedByteType, depthBuffer: true };
    RT = { W: MW, H: MH, lit: new THREE.WebGLRenderTarget(MW, MH, opt), norm: new THREE.WebGLRenderTarget(MW, MH, opt), a: new Uint8Array(MW * MH * 4), b: new Uint8Array(MW * MH * 4) };
    return RT;
  }

  function ortho(cam, halfW, wc, hc) {
    const halfH = (halfW * (hc * Stage.aspect)) / wc;
    cam.left = -halfW;
    cam.right = halfW;
    cam.top = halfH;
    cam.bottom = -halfH;
    cam.updateProjectionMatrix();
    return halfH;
  }

  function makeCam() {
    const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 60);
    cam.position.set(0, 0, 20);
    return cam;
  }

  function lights(scene, key = 1.15, amb = 0.34) {
    // three r155+ uses physical light units; x PI makes a white Lambert surface read as 1.0
    scene.add(new THREE.AmbientLight(0xffffff, amb * Math.PI));
    const d = new THREE.DirectionalLight(0xffffff, key * Math.PI * 0.78);
    d.position.set(-2, 2.4, 4);
    scene.add(d);
  }

  /* ───────── the converter ───────── */
  function rasterize(scene, cam, wc, hc, dark, planes) {
    const W = wc * 2;
    const H = hc * 4;
    const rt = ensureRT(W, H);
    [rt.lit, rt.norm].forEach((t) => {
      t.viewport.set(0, 0, W, H);
      t.scissor.set(0, 0, W, H);
      t.scissorTest = false;
    });
    const want = planes || null;
    if (normMat.clippingPlanes !== want) {
      normMat.clippingPlanes = want;
      normMat.needsUpdate = true;
    }
    renderer.setRenderTarget(rt.lit);
    renderer.clear();
    renderer.render(scene, cam);
    scene.overrideMaterial = normMat;
    renderer.setRenderTarget(rt.norm);
    renderer.clear();
    renderer.render(scene, cam);
    scene.overrideMaterial = null;
    renderer.setRenderTarget(null);
    renderer.readRenderTargetPixels(rt.lit, 0, 0, W, H, rt.a);
    renderer.readRenderTargetPixels(rt.norm, 0, 0, W, H, rt.b);
    return toCells(rt.a, rt.b, W, W, H, wc, hc, dark);
  }

  function toCells(A, B, stride, W, H, wc, hc, dark) {
    const n = wc * hc;
    const cov = new Float32Array(n);
    const lum = new Float32Array(n);
    const F = new Float32Array(n);
    for (let cy = 0; cy < hc; cy += 1) {
      for (let cx = 0; cx < wc; cx += 1) {
        let a = 0;
        let l = 0;
        let s = 0;
        for (let py = 0; py < 4; py += 1) {
          const row = H - 1 - (cy * 4 + py);
          for (let px = 0; px < 2; px += 1) {
            const i = (row * stride + cx * 2 + px) * 4;
            const al = B[i + 3] / 255;
            if (al <= 0) continue;
            a += al;
            l += (A[i] / 255) * al;
            s += (((B[i] * 0.5 + B[i + 1] * 0.3 + B[i + 2] * 0.2) / 255) * al);
          }
        }
        const c = cx + cy * wc;
        cov[c] = a / 8;
        lum[c] = a > 0 ? l / a : 0;
        F[c] = a / 8 + 0.6 * (s / 8) + 1.4 * (l / 8);
      }
    }
    const chars = new Uint16Array(n);
    const lv = new Uint8Array(n);
    const at = (x, y) => (x < 0 || y < 0 || x >= wc || y >= hc ? 0 : F[x + y * wc]);
    for (let cy = 0; cy < hc; cy += 1) {
      for (let cx = 0; cx < wc; cx += 1) {
        const c = cx + cy * wc;
        if (cov[c] < 0.1) continue;
        const gx = at(cx + 1, cy) - at(cx - 1, cy);
        const gy = (at(cx, cy + 1) - at(cx, cy - 1)) * 0.5;
        const m = Math.hypot(gx, gy);
        if (cov[c] >= 0.22 && m > 0.62) {
          // contour character: perpendicular to the gradient
          let psi = (Math.atan2(gy, gx) * 180) / Math.PI + 90;
          psi = ((psi % 180) + 180) % 180;
          chars[c] = psi < 22.5 || psi >= 157.5 ? 45 : psi < 67.5 ? 92 : psi < 112.5 ? 124 : 47;
          lv[c] = 255;
          continue;
        }
        if (cov[c] < 0.4) continue;
        const v = clamp((dark ? lum[c] : 1 - lum[c]) * 0.95, 0, 1);
        const t = BAYER[(cx & 3) + (cy & 3) * 4] / 16 - 0.5;
        const idx = clamp(Math.round(v * 5 + t * 0.9), 0, 5);
        chars[c] = RAMP.charCodeAt(idx);
        lv[c] = Math.round(120 + 135 * v);
      }
    }
    return { chars, cov, lv, wc, hc };
  }

  function blit(buf, rect, res, tone) {
    for (let cy = 0; cy < res.hc; cy += 1) {
      for (let cx = 0; cx < res.wc; cx += 1) {
        const c = cx + cy * res.wc;
        const code = res.chars[c];
        if (code === 0) {
          if (res.cov[c] > 0.55) buf.set(rect.x + cx, rect.y + cy, 32, 0);
          continue;
        }
        buf.set(rect.x + cx, rect.y + cy, code, tone || 0, res.lv ? res.lv[c] : 255);
      }
    }
  }

  const M = (color) => new THREE.MeshLambertMaterial({ color });

  /* ───────── EYE: a gazing eyeball seen through an almond-shaped lid opening ───────── */
  const eye = (() => {
    const scene = new THREE.Scene();
    lights(scene);
    const ball = new THREE.Group();
    ball.add(new THREE.Mesh(new THREE.SphereGeometry(1, 56, 36), M(0xe8e8e8)));
    const cap = (r, th, color) => {
      const g = new THREE.SphereGeometry(r, 48, 24, 0, Math.PI * 2, 0, th);
      g.rotateX(Math.PI / 2);
      return new THREE.Mesh(g, M(color));
    };
    ball.add(cap(1.012, 0.38, 0x6a6a6a), cap(1.018, 0.29, 0x2c2c2c), cap(1.026, 0.15, 0x000000));
    scene.add(ball);
    return { scene, ball, cam: makeCam() };
  })();

  API.drawEye = (buf, rect, o) => {
    if (rect.w < 8 || rect.h < 4) return null;
    const e = eye;
    e.ball.rotation.set(clamp(o.lookY, -1, 1) * 0.5, clamp(o.lookX, -1, 1) * 0.75, 0);
    ortho(e.cam, 1.04, rect.w, rect.h);
    const res = rasterize(e.scene, e.cam, rect.w, rect.h, o.dark !== false);
    const cx = (rect.w - 1) / 2;
    const cy = (rect.h - 1) / 2;
    const Wc = rect.w * 0.46;
    const open = clamp(o.open, 0, 1);
    const Hc = (open * Wc) / 3 / Stage.aspect;
    const limAt = (nx) => Hc * Math.pow(Math.max(0, 1 - nx * nx), 0.9);
    const inside = (x, y) => {
      const nx = (x - cx) / Wc;
      return Math.abs(nx) < 1 && Math.abs(y - cy) <= limAt(nx) && Hc >= 0.9;
    };
    for (let y = 0; y < rect.h; y += 1) {
      for (let x = 0; x < rect.w; x += 1) {
        const c = x + y * rect.w;
        if (!inside(x, y)) {
          res.chars[c] = 0;
          res.cov[c] = 0;
        } else if (res.chars[c] === 0) {
          res.chars[c] = 32;
          res.cov[c] = 1;
        }
      }
    }
    blit(buf, rect, res, 0);
    // lid line
    if (Hc < 0.9) {
      for (let x = 0; x < rect.w; x += 1) {
        const nx = (x - cx) / Wc;
        if (Math.abs(nx) < 1) buf.set(rect.x + x, rect.y + Math.round(cy), Math.abs(nx) > 0.9 ? 126 : 45, 0);
      }
    } else {
      for (let y = 0; y < rect.h; y += 1) {
        for (let x = 0; x < rect.w; x += 1) {
          if (!inside(x, y)) continue;
          if (inside(x - 1, y) && inside(x + 1, y) && inside(x, y - 1) && inside(x, y + 1)) continue;
          const nx = (x - cx) / Wc;
          const limp = (Hc * 0.9 * Math.pow(Math.max(1e-3, 1 - nx * nx), -0.1) * (-2 * nx)) / Wc;
          const sl = y < cy ? -limp : limp;
          const code = Math.abs(sl * Stage.aspect) < 0.55 ? 45 : sl < 0 ? 47 : 92;
          buf.set(rect.x + x, rect.y + y, code, 0);
        }
      }
    }
    return { cx: rect.x + cx, cy: rect.y + cy, Wc, Hc };
  };

  /* ───────── CCTV cluster ───────── */
  const cctv = (() => {
    const scene = new THREE.Scene();
    lights(scene);
    const cams = [];
    for (let i = 0; i < 8; i += 1) {
      const g = new THREE.Group();
      const pivot = new THREE.Group();
      g.add(pivot);
      const plate = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.4, 1.0), M(0xe6e6e6));
      plate.position.set(-1.1, 0, 0);
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1.1, 12), M(0xcfcfcf));
      arm.rotation.z = Math.PI / 2;
      arm.position.set(-0.55, 0, 0);
      g.add(plate, arm);
      const bodyG = new THREE.CylinderGeometry(0.52, 0.52, 2.3, 30);
      bodyG.rotateX(Math.PI / 2);
      const body = new THREE.Mesh(bodyG, M(0xffffff));
      body.position.z = 1.15;
      const hood = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.07, 2.5), M(0xdcdcdc));
      hood.position.set(0, 0.62, 1.25);
      const ringG = new THREE.TorusGeometry(0.54, 0.075, 10, 30);
      const ring = new THREE.Mesh(ringG, M(0xbbbbbb));
      ring.position.z = 2.3;
      const lensG = new THREE.CylinderGeometry(0.4, 0.4, 0.4, 28);
      lensG.rotateX(Math.PI / 2);
      const lens = new THREE.Mesh(lensG, M(0x2a2a2a));
      lens.position.z = 2.35;
      const glassG = new THREE.SphereGeometry(0.34, 24, 12, 0, Math.PI * 2, 0, 0.9);
      glassG.rotateX(Math.PI / 2);
      const glass = new THREE.Mesh(glassG, M(0x000000));
      glass.position.z = 2.45;
      const led = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), M(0xffffff));
      led.position.set(0.3, 0.38, 0.45);
      pivot.add(body, hood, ring, lens, glass, led);
      g.visible = false;
      scene.add(g);
      cams.push({ g, pivot });
    }
    return { scene, cams, cam: makeCam() };
  })();

  /* returns the screen cells of each camera so the HUD can label them */
  API.drawCctv = (buf, rect, o) => {
    if (rect.w < 20 || rect.h < 6) return [];
    const c = cctv;
    const n = clamp(Math.round(o.n), 1, c.cams.length);
    const halfW = o.halfW || 7.4;
    const halfH = ortho(c.cam, halfW, rect.w, rect.h);
    const marks = [];
    c.cams.forEach((k, i) => {
      k.g.visible = i < n;
      if (i >= n) return;
      const row = i < 4 ? 0 : 1;
      const x = o.solo ? 0 : -5.2 + (i % 4) * 3.5 + row * 1.75;
      const y = o.solo ? 0 : row === 0 ? halfH * 0.46 : -halfH * 0.46;
      k.g.position.set(x, y, 0);
      k.g.scale.setScalar(o.scale || 0.78);
      const cellX = rect.x + (x / halfW * 0.5 + 0.5) * rect.w;
      const cellY = rect.y + (0.5 - y / halfH * 0.5) * rect.h;
      const ly = clamp(((o.ptr.x - cellX) / (Stage.cols * 0.3)), -1, 1);
      const lx = clamp(((o.ptr.y - cellY) / (Stage.rows * 0.5)), -1, 1);
      const t = o.t || 0;
      k.pivot.rotation.set(0.12 + lx * 0.42 + Math.sin(t * 0.5 + i) * 0.04, -0.55 + ly * 0.9 + Math.sin(t * 0.3 + i * 2) * 0.05, 0, "YXZ");
      marks.push({ x: cellX, y: cellY, i });
    });
    blit(buf, rect, rasterize(c.scene, c.cam, rect.w, rect.h, o.dark === true), 0);
    return marks;
  };

  const loader = new GLTFLoader();
  const draco = new DRACOLoader();
  draco.setDecoderPath("vendor/jsm/libs/draco/gltf/");
  loader.setDRACOLoader(draco);

  /* optional: a real CCTV model replaces the hand-built camera (set window.__useCamModel = true before load) */
  if (window.__useCamModel) loader.load(
    "vendor/models/security_camera.glb",
    (gltf) => {
      const box = new THREE.Box3().setFromObject(gltf.scene);
      const size = new THREE.Vector3();
      const center = new THREE.Vector3();
      box.getSize(size);
      box.getCenter(center);
      const s = 2.7 / Math.max(size.x, size.y, size.z);
      cctv.cams.forEach((k) => {
        [...k.g.children].forEach((c) => {
          if (c !== k.pivot) k.g.remove(c);
        });
        while (k.pivot.children.length) k.pivot.remove(k.pivot.children[0]);
        const m = gltf.scene.clone(true);
        m.traverse((o) => {
          if (o.isMesh) o.material = M(0xffffff);
        });
        m.position.sub(center);
        const wrap = new THREE.Group();
        wrap.add(m);
        wrap.scale.setScalar(s);
        wrap.rotation.y = window.__camFlip || 0;
        k.pivot.add(wrap);
      });
      API.camModel = true;
    },
    undefined,
    () => {}
  );

  /* ───────── BODY (animated X Bot — the subject) ───────── */
  const body = { scene: new THREE.Scene(), cam: makeCam(), group: new THREE.Group(), mixer: null, actions: {}, current: "", clock: new THREE.Clock(), plane: new THREE.Plane(new THREE.Vector3(0, 1, 0), 0) };
  lights(body.scene, 1.2, 0.3);
  body.scene.add(body.group);
  loader.load(
    "vendor/models/Xbot.glb",
    (gltf) => {
      gltf.scene.traverse((o) => {
        if (o.isMesh) {
          const mat = M(0xffffff);
          mat.clippingPlanes = [body.plane];
          o.material = mat;
          o.frustumCulled = false;
        }
      });
      body.group.add(gltf.scene);
      body.mixer = new THREE.AnimationMixer(gltf.scene);
      gltf.animations.forEach((a) => (body.actions[a.name] = body.mixer.clipAction(a)));
      body.current = "idle";
      if (body.actions.idle) body.actions.idle.play();
      API.bodyReady = true;
    },
    undefined,
    () => {}
  );

  API.drawBody = (buf, rect, o) => {
    if (!API.bodyReady || rect.w < 10 || rect.h < 10) return null;
    const b = body;
    b.mixer.update(Math.min(0.05, b.clock.getDelta()));
    const want = o.anim || "idle";
    if (want !== b.current && b.actions[want]) {
      const next = b.actions[want];
      next.reset().play();
      if (b.actions[b.current]) b.actions[b.current].crossFadeTo(next, 0.4, false);
      b.current = want;
    }
    b.group.rotation.y = clamp(o.lookX, -1, 1) * 0.45 + (o.spin || 0);
    const halfH = ortho(b.cam, Math.max(0.62, (1.08 * rect.w) / (rect.h * Stage.aspect)), rect.w, rect.h);
    b.cam.position.y = 0.86;
    const scanY = 1.95 - clamp(o.scan, 0, 1) * 2.05;
    b.plane.constant = -scanY;
    blit(buf, rect, rasterize(b.scene, b.cam, rect.w, rect.h, o.dark === true, [b.plane]), 0);
    return { scanRow: rect.y + (0.5 - (scanY - 0.86) / halfH * 0.5) * rect.h, halfH };
  };

  /* ───────── HEAD (scanned subject) ───────── */
  const head = { scene: new THREE.Scene(), group: new THREE.Group(), cam: makeCam(), plane: new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), halfH: 1.4 };
  lights(head.scene, 1.2, 0.3);
  head.scene.add(head.group);
  loader.load(
    "vendor/models/LeePerrySmith.glb",
    (gltf) => {
      const mat = M(0xc4c4c4);
      mat.clippingPlanes = [head.plane];
      let mesh = null;
      gltf.scene.traverse((o) => {
        if (o.isMesh && !mesh) mesh = o;
      });
      if (!mesh) return;
      mesh.material = mat;
      const box = new THREE.Box3().setFromObject(gltf.scene);
      const size = new THREE.Vector3();
      const center = new THREE.Vector3();
      box.getSize(size);
      box.getCenter(center);
      const s = 2.9 / size.y;
      gltf.scene.position.sub(center);
      const wrap = new THREE.Group();
      wrap.add(gltf.scene);
      wrap.scale.setScalar(s);
      head.group.add(wrap);
      API.headReady = true;
    },
    undefined,
    () => {
      API.headReady = false;
    }
  );

  API.drawHead = (buf, rect, o) => {
    if (!API.headReady || rect.w < 12 || rect.h < 8) return null;
    const h = head;
    const halfW = 1.9;
    const halfH = ortho(h.cam, halfW, rect.w, rect.h);
    h.group.rotation.set(clamp(o.lookY, -1, 1) * 0.16, clamp(o.lookX, -1, 1) * 0.55 + (o.spin || 0), 0);
    const top = 1.3;
    const scanY = top - clamp(o.scan, 0, 1) * 2.8;
    h.plane.constant = -scanY;
    blit(buf, rect, rasterize(h.scene, h.cam, rect.w, rect.h, o.dark === true, [h.plane]), 0);
    return { scanRow: rect.y + (0.5 - scanY / halfH * 0.5) * rect.h, cx: rect.x + rect.w / 2, halfH };
  };

  API._cctv = typeof cctv !== 'undefined' ? cctv : null;
  API.ready = true;
}
