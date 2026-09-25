/*
 * TypingTestKaro — 3D hero: a floating bilingual keyboard that "types" phrases.
 * ES module; Three.js is loaded from the CDN through the page's import map.
 * Phrases and their key sequences come from window.TE_HERO (built at compile time).
 */
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

const canvas = document.getElementById("hero-kb");
const visual = document.querySelector(".hero-visual");
const typedEl = document.querySelector("[data-typed]");
const wpmEl = document.querySelector("[data-wpm]");
const DATA = window.TE_HERO || { phrases: [], labels: {} };
const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function fail() {
  if (visual) visual.classList.add("no-webgl");
}

if (canvas) {
  try { init(); } catch (e) { fail(); }
}

function init() {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  camera.position.set(0, 10.5, 13.5);
  camera.lookAt(0, 0, 0.4);

  /* ---------- lights ---------- */
  scene.add(new THREE.HemisphereLight(0xe6fff8, 0x053b33, 1.1));
  const key = new THREE.DirectionalLight(0xffffff, 2.1);
  key.position.set(4, 10, 6);
  scene.add(key);
  const rimA = new THREE.PointLight(0x2dd4bf, 60, 30, 2);
  rimA.position.set(-8, 3, -3);
  scene.add(rimA);
  const rimB = new THREE.PointLight(0xfbbf24, 45, 30, 2);
  rimB.position.set(8, 2, 4);
  scene.add(rimB);

  /* ---------- keyboard ---------- */
  const U = 1; // one key unit
  const ROWS = [
    [["`"], ["1"], ["2"], ["3"], ["4"], ["5"], ["6"], ["7"], ["8"], ["9"], ["0"], ["-"], ["="], ["Backspace", 2]],
    [["Tab", 1.5], ["q"], ["w"], ["e"], ["r"], ["t"], ["y"], ["u"], ["i"], ["o"], ["p"], ["["], ["]"], ["\\", 1.5]],
    [["Caps", 1.75], ["a"], ["s"], ["d"], ["f"], ["g"], ["h"], ["j"], ["k"], ["l"], [";"], ["'"], ["Enter", 2.25]],
    [["ShiftL", 2.25], ["z"], ["x"], ["c"], ["v"], ["b"], ["n"], ["m"], [","], ["."], ["/"], ["ShiftR", 2.75]],
    [["Ctrl", 1.5], ["Alt", 1.25], ["Space", 6.25], ["AltR", 1.25], ["Fn", 1.25], ["CtrlR", 1.5]]
  ];
  const WIDTH = 15;
  const board = new THREE.Group();
  scene.add(board);

  // case
  const caseMat = new THREE.MeshStandardMaterial({ color: 0x0b3d36, roughness: 0.35, metalness: 0.55 });
  const caseMesh = new THREE.Mesh(new RoundedBoxGeometry(WIDTH + 0.9, 0.55, 5 + 0.9, 4, 0.28), caseMat);
  caseMesh.position.y = -0.34;
  board.add(caseMesh);
  const plateMat = new THREE.MeshStandardMaterial({ color: 0x05241f, roughness: 0.8, metalness: 0.2 });
  const plate = new THREE.Mesh(new THREE.BoxGeometry(WIDTH + 0.2, 0.05, 5.2), plateMat);
  plate.position.y = -0.04;
  board.add(plate);
  // accent light strip along the front edge
  const strip = new THREE.Mesh(new THREE.BoxGeometry(WIDTH + 0.4, 0.06, 0.06),
    new THREE.MeshBasicMaterial({ color: 0xf59e0b }));
  strip.position.set(0, -0.2, 2.93);
  board.add(strip);

  const geoCache = {};
  const capGeo = (w) => geoCache[w] || (geoCache[w] = new RoundedBoxGeometry(w * U - 0.12, 0.42, 0.88, 3, 0.11));
  const topGeoCache = {};
  const topGeo = (w) => topGeoCache[w] || (topGeoCache[w] = new THREE.PlaneGeometry(w * U - 0.26, 0.74));

  const SPECIAL = { Backspace: "⌫", Tab: "Tab", Caps: "Caps", Enter: "Enter", ShiftL: "Shift", ShiftR: "Shift", Ctrl: "Ctrl", CtrlR: "Ctrl", Alt: "Alt", AltR: "Alt", Fn: "Fn", Space: "" };
  const COL_CAP = new THREE.Color(0xfffaf0), COL_MOD = new THREE.Color(0x0f766e), COL_SPACE = new THREE.Color(0xf59e0b);
  const COL_HOT = new THREE.Color(0xfcd34d);
  const keys = {}; // name -> { mesh, mat, base, y, press }

  function labelTexture(name, w, dark) {
    const px = 128, c = document.createElement("canvas");
    c.width = Math.round(px * w); c.height = px;
    const x = c.getContext("2d");
    x.textBaseline = "middle";
    const ink = dark ? "#ffffff" : "#064e3b";
    if (SPECIAL[name] !== undefined) {
      x.fillStyle = ink; x.font = "700 30px 'Uncut Sans', Arial, sans-serif"; x.textAlign = "left";
      x.fillText(SPECIAL[name], 16, px - 30);
    } else {
      const main = /[a-z]/.test(name) ? name.toUpperCase() : name;
      x.fillStyle = ink; x.textAlign = "left"; x.font = "700 46px 'Uncut Sans', Arial, sans-serif";
      x.fillText(main, 16, 38);
      const hi = DATA.labels[name];
      if (hi) {
        x.fillStyle = "#d97706"; x.textAlign = "right"; x.font = "600 44px 'Noto Sans Devanagari', Mangal, sans-serif";
        x.fillText(hi, c.width - 14, px - 36);
      }
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  }

  ROWS.forEach((row, r) => {
    let x = -WIDTH / 2;
    row.forEach(([name, w = 1]) => {
      const isMod = SPECIAL[name] !== undefined && name !== "Space";
      const mat = new THREE.MeshStandardMaterial({
        color: name === "Space" ? COL_SPACE.clone() : isMod ? COL_MOD.clone() : COL_CAP.clone(),
        roughness: 0.42, metalness: 0.05, emissive: new THREE.Color(0x000000)
      });
      const cap = new THREE.Mesh(capGeo(w), mat);
      const cx = x + (w * U) / 2, cz = -2 + r * U;
      cap.position.set(cx, 0.2, cz);
      const top = new THREE.Mesh(topGeo(w), new THREE.MeshBasicMaterial({ map: labelTexture(name, w, isMod), transparent: true, toneMapped: false }));
      top.rotation.x = -Math.PI / 2;
      top.position.y = 0.212;
      cap.add(top);
      board.add(cap);
      keys[name] = { mesh: cap, mat, w, press: 0 };
      x += w * U;
    });
  });

  // soft shadow under the board
  const sh = document.createElement("canvas");
  sh.width = sh.height = 128;
  const sx = sh.getContext("2d"), g = sx.createRadialGradient(64, 64, 4, 64, 64, 64);
  g.addColorStop(0, "rgba(2,24,20,.55)"); g.addColorStop(1, "rgba(2,24,20,0)");
  sx.fillStyle = g; sx.fillRect(0, 0, 128, 128);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(22, 9), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sh), transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -1.6;
  scene.add(shadow);

  /* ---------- floating letters ---------- */
  const GLYPHS = ["A", "क", "W", "अ", "P", "म", "M", "ह", "T", "भ", "S", "र", "K", "त", "E", "स", "न", "Q", "य", "Z"];
  const sprites = [];
  GLYPHS.forEach((ch, i) => {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const x = c.getContext("2d");
    x.font = /[A-Z]/.test(ch) ? "700 84px 'Uncut Sans', Arial, sans-serif" : "700 84px 'Noto Sans Devanagari', sans-serif";
    x.textAlign = "center"; x.textBaseline = "middle";
    x.fillStyle = i % 3 === 0 ? "#fcd34d" : "#a7f3d0";
    x.fillText(ch, 64, 70);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0.55, depthWrite: false }));
    const ang = (i / GLYPHS.length) * Math.PI * 2;
    s.userData = { ang, rad: 8 + (i % 4) * 0.9, y0: -1 + (i % 5) * 1.1, speed: 0.08 + (i % 3) * 0.03, bob: Math.random() * 6 };
    s.scale.setScalar(0.9 + (i % 3) * 0.35);
    scene.add(s);
    sprites.push(s);
  });

  /* ---------- sizing ---------- */
  function resize() {
    const r = canvas.getBoundingClientRect();
    const w = Math.max(1, r.width), h = Math.max(1, r.height);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // Distance that fits the whole board (≈19 units incl. tilt & margin) horizontally,
    // but never closer than the "hero" framing.
    const hfov = 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect);
    const dist = Math.max(15.2, 9.1 / Math.tan(hfov / 2));
    const dir = new THREE.Vector3(0, 10.5, 13.5).normalize();
    camera.position.copy(dir.multiplyScalar(dist));
    camera.lookAt(0, 0, 0.4);
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener("resize", resize);

  /* ---------- interaction ---------- */
  const tilt = { x: 0, y: 0, tx: 0, ty: 0 };
  let scrollP = 0;
  window.TEHero3D = { setScroll: (p) => { scrollP = p; } };
  if (!reduced) {
    (visual || canvas).addEventListener("pointermove", (e) => {
      const r = canvas.getBoundingClientRect();
      tilt.tx = ((e.clientX - r.left) / r.width - 0.5) * 0.5;
      tilt.ty = ((e.clientY - r.top) / r.height - 0.5) * 0.3;
    });
    (visual || canvas).addEventListener("pointerleave", () => { tilt.tx = 0; tilt.ty = 0; });
  }

  /* ---------- typing choreography ---------- */
  function pressKey(name, strong) {
    const k = keys[name];
    if (k) k.press = strong ? 1 : 0.85;
  }
  const phrases = DATA.phrases;
  let pi = 0, ci = 0, typed = "", nextAt = 0, holdUntil = 0, startedAt = 0, charsTyped = 0;
  function stepTyping(now) {
    if (!phrases.length || !typedEl) return;
    if (now < nextAt) return;
    const ph = phrases[pi];
    if (ci === 0 && !typed) { startedAt = now; charsTyped = 0; }
    if (ci < ph.steps.length) {
      const st = ph.steps[ci];
      st.keys.forEach((k) => pressKey(k));
      typed = ph.text.slice(0, st.upto);
      typedEl.textContent = typed;
      typedEl.setAttribute("lang", ph.lang);
      charsTyped++;
      if (wpmEl) {
        const min = Math.max((now - startedAt) / 60000, 0.02);
        wpmEl.textContent = Math.min(99, Math.round(charsTyped / 5 / min));
      }
      ci++;
      nextAt = now + 95 + Math.random() * 110 + (st.keys[0] === "Space" ? 90 : 0);
      if (ci === ph.steps.length) holdUntil = nextAt + 1900;
    } else if (now >= holdUntil) {
      // clear and move to the next phrase
      typed = ""; typedEl.textContent = ""; ci = 0;
      pi = (pi + 1) % phrases.length;
      nextAt = now + 450;
    }
  }

  /* ---------- loop ---------- */
  const clock = new THREE.Clock();
  let running = false, visible = true, raf = 0;
  function frame() {
    raf = 0;
    if (!running) return;
    const t = clock.getElapsedTime(), now = performance.now();
    stepTyping(now);
    tilt.x += (tilt.tx - tilt.x) * 0.06;
    tilt.y += (tilt.ty - tilt.y) * 0.06;
    board.position.y = Math.sin(t * 1.1) * 0.18 - scrollP * 1.2;
    board.rotation.x = 0.1 + tilt.y + scrollP * 0.55;
    board.rotation.y = -0.18 + tilt.x + Math.sin(t * 0.35) * 0.05;
    board.rotation.z = Math.sin(t * 0.7) * 0.02;
    shadow.material.opacity = 0.9 - scrollP * 0.6;
    for (const name in keys) {
      const k = keys[name];
      if (k.press > 0.001) {
        k.press *= 0.86;
        k.mesh.position.y = 0.2 - k.press * 0.2;
        k.mat.emissive.copy(COL_HOT).multiplyScalar(k.press * 0.55);
      } else if (k.press !== 0) {
        k.press = 0; k.mesh.position.y = 0.2; k.mat.emissive.setRGB(0, 0, 0);
      }
    }
    sprites.forEach((s) => {
      const d = s.userData, a = d.ang + t * d.speed;
      s.position.set(Math.cos(a) * d.rad, d.y0 + Math.sin(t * 0.8 + d.bob) * 0.6, Math.sin(a) * d.rad * 0.45 - 1.5);
    });
    strip.material.color.setHSL(0.11 + Math.sin(t * 0.8) * 0.015, 0.95, 0.55);
    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  }
  function setRunning(on) {
    on = on && visible && !document.hidden && !reduced;
    if (on === running) return;
    running = on;
    if (on) { clock.getDelta(); if (!raf) raf = requestAnimationFrame(frame); }
  }
  const io = new IntersectionObserver((entries) => { visible = entries[0].isIntersecting; setRunning(true); }, { threshold: 0.05 });
  io.observe(canvas);
  document.addEventListener("visibilitychange", () => setRunning(true));

  const ready = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  ready.then(() => {
    // redraw labels once web fonts are available
    Object.keys(keys).forEach((name) => {
      const k = keys[name], top = k.mesh.children[0];
      const isMod = SPECIAL[name] !== undefined && name !== "Space";
      top.material.map.dispose();
      top.material.map = labelTexture(name, k.w, isMod);
      top.material.needsUpdate = true;
    });
    if (reduced) {
      // static, fully-typed frame
      if (typedEl && phrases[0]) typedEl.textContent = phrases[0].text;
      board.rotation.set(0.1, -0.18, 0);
      renderer.render(scene, camera);
    }
    visual && visual.classList.add("is-ready");
    setRunning(true);
  });
}
