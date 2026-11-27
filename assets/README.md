# assets

- `video/telescreen.mp4` — (optional) drop any clip here. Scene 5's telescreen plays it as ASCII (brightness → characters,
  edges drawn along contours, same dithering as the 3D objects). Without the file the telescreen shows the log text.
  Tip: high-contrast footage works best — CCTV / crowds / night streets, 10–30 s, loopable, ≤ 15 MB.
- 3D models live in `../vendor/models/` (`Xbot.glb` — animated humanoid, `LeePerrySmith.glb` — head scan,
  `security_camera.glb` — optional CCTV, enabled with `window.__useCamModel = true`).

Credits: Xbot (Mixamo, via three.js examples) · Lee Perry-Smith head scan (CC BY 3.0) · three.js · FIGlet "Doom" ·
IBM Plex Mono · Pretendard · George Orwell, Nineteen Eighty-Four (Project Gutenberg Australia).
