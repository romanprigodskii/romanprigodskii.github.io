/* The hero field in WebGL.
   The 84 hypotheses of the e-value audit, placed at their real e-values:
   x is the e-value at fair odds, y the same bet after the book's margin, both
   on a log scale, and z separates the nine hypothesis families. Two
   translucent planes sit at e = 20 on each axis.

   As the hero scrolls, the camera swings round to face the data, the
   families collapse onto one plane, and the two planes become the two dashed
   rules of the ordinary scatter chart. Nothing here is decoration: every
   point is a row of assets/data/audit.json.

   Raw WebGL, no library. Returns null where WebGL is unavailable, and the
   caller falls back to the 2D canvas field. */
(function (w) {
  "use strict";

  /* ---------- small matrix kit ---------- */
  function perspective(fovy, aspect, near, far) {
    var f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far);
    return [f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0];
  }
  function lookAt(e, t, u) {
    var zx = e[0] - t[0], zy = e[1] - t[1], zz = e[2] - t[2];
    var zl = Math.hypot(zx, zy, zz); zx /= zl; zy /= zl; zz /= zl;
    var xx = u[1] * zz - u[2] * zy, xy = u[2] * zx - u[0] * zz, xz = u[0] * zy - u[1] * zx;
    var xl = Math.hypot(xx, xy, xz); xx /= xl; xy /= xl; xz /= xl;
    var yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx;
    return [xx, yx, zx, 0, xy, yy, zy, 0, xz, yz, zz, 0,
      -(xx * e[0] + xy * e[1] + xz * e[2]), -(yx * e[0] + yy * e[1] + yz * e[2]), -(zx * e[0] + zy * e[1] + zz * e[2]), 1];
  }
  function mul(a, b) {
    var o = new Array(16);
    for (var c = 0; c < 4; c++) for (var r = 0; r < 4; r++) {
      o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
    }
    return o;
  }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  /* ---------- colour from a CSS custom property ---------- */
  var probe = document.createElement("canvas");
  probe.width = probe.height = 1;
  var pctx = probe.getContext("2d", { willReadFrequently: true });
  function rgbOf(cssColor, fallback) {
    if (!pctx) return fallback;
    pctx.clearRect(0, 0, 1, 1);
    pctx.fillStyle = "#000";
    pctx.fillStyle = cssColor || "#000";
    pctx.fillRect(0, 0, 1, 1);
    var d = pctx.getImageData(0, 0, 1, 1).data;
    return [d[0] / 255, d[1] / 255, d[2] / 255];
  }

  /* ---------- shaders ---------- */
  var VS_POINT = [
    "attribute vec3 aPos; attribute float aSize; attribute float aKind; attribute float aIdx;",
    "uniform mat4 uMVP; uniform float uZ; uniform float uDpr; uniform float uReveal;",
    "uniform float uHover; uniform float uCount; uniform float uShift; uniform float uShiftY; uniform float uFoldP;",
    "varying float vKind; varying float vAlpha; varying float vHover;",
    "void main(){",
    "  vec4 clip = uMVP * vec4(aPos.x, aPos.y, aPos.z * uZ, 1.0);",
    "  clip.x += uShift * clip.w; clip.y += uShiftY * clip.w;",
    "  gl_Position = clip;",
    "  float h = abs(aIdx - uHover) < 0.5 ? 1.0 : 0.0;",
    "  vHover = h;",
    "  float appear = clamp((uReveal * (uCount + 24.0) - aIdx) / 24.0, 0.0, 1.0);",
    "  vAlpha = appear;",
    "  float persp = mix(4.2 / clip.w, 0.74, uFoldP);",
    "  gl_PointSize = max(1.0, aSize * uDpr * persp * (1.0 + h * 0.9) * (0.4 + 0.6 * appear));",
    "  vKind = aKind;",
    "}"].join("\n");
  var FS_POINT = [
    "precision mediump float;",
    "uniform vec3 uInk; uniform vec3 uAcc;",
    "varying float vKind; varying float vAlpha; varying float vHover;",
    "void main(){",
    "  vec2 c = gl_PointCoord * 2.0 - 1.0;",
    "  float r = length(c);",
    "  if (r > 1.0) discard;",
    "  float edge = 1.0 - smoothstep(0.82, 1.0, r);",
    "  float ring = smoothstep(0.50, 0.64, r) * edge;",
    "  vec3 col = uInk; float a = ring * 0.46;",
    "  if (vKind > 1.5) { col = uAcc; a = edge; }",
    "  else if (vKind > 0.5) { col = uAcc; a = ring; }",
    "  if (vHover > 0.5) { col = uAcc; a = max(a, edge); }",
    "  gl_FragColor = vec4(col, a * vAlpha);",
    "}"].join("\n");
  var VS_LINE = [
    "attribute vec3 aPos; attribute float aKind;",
    "uniform mat4 uMVP; uniform float uZ; uniform float uShift; uniform float uShiftY;",
    "varying float vKind;",
    "void main(){",
    "  vec4 clip = uMVP * vec4(aPos.x, aPos.y, aPos.z * uZ, 1.0);",
    "  clip.x += uShift * clip.w; clip.y += uShiftY * clip.w;",
    "  gl_Position = clip; vKind = aKind;",
    "}"].join("\n");
  var FS_LINE = [
    "precision mediump float;",
    "uniform vec3 uInk; uniform vec3 uAcc; uniform vec3 uRule; uniform float uFold; uniform float uReveal;",
    "varying float vKind;",
    "void main(){",
    "  vec3 col; float a;",
    "  if (vKind < 0.5) { col = uRule; a = 0.9 * (1.0 - uFold); }",
    "  else if (vKind < 1.5) { col = uInk; a = 0.13 * (1.0 - uFold); }",
    "  else if (vKind < 2.5) { col = uAcc; a = 0.55; }",
    "  else { col = uAcc; a = 0.07 * (1.0 - uFold * 0.85); }",
    "  gl_FragColor = vec4(col, a * uReveal);",
    "}"].join("\n");

  function compile(gl, type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }
  function program(gl, vs, fs) {
    var p = gl.createProgram();
    gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, vs));
    gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    return p;
  }

  /* ---------- the field ---------- */
  function field3d(canvas, rows, opts) {
    var gl = null;
    try {
      gl = canvas.getContext("webgl", { antialias: true, alpha: true, premultipliedAlpha: false, powerPreference: "low-power" });
    } catch (e) { gl = null; }
    if (!gl) return null;

    var reduced = !!opts.reduced;
    var XD = [-2, 2.22], YD = [-2, 1.42];
    function X(v) { return ((Math.log10(Math.max(v, 0.01)) - XD[0]) / (XD[1] - XD[0])) * 3.4 - 1.7; }
    function Y(v) { return ((Math.log10(Math.max(v, 0.01)) - YD[0]) / (YD[1] - YD[0])) * 2.2 - 1.1; }
    var FLOOR = -1.18, ZS = 1.35;

    var fams = [];
    rows.forEach(function (r) { if (fams.indexOf(r.f) < 0) fams.push(r.f); });
    fams.sort();

    /* order the points so the reveal sweeps from the weakest evidence to the strongest */
    var pts = rows.map(function (r) {
      var fi = fams.indexOf(r.f);
      return {
        r: r,
        x: X(r.ef), y: Y(r.er),
        z: fams.length > 1 ? (fi / (fams.length - 1)) * 2 * ZS - ZS : 0,
        size: 5.5 + Math.sqrt(r.n) * 0.62,
        kind: r.er >= 20 ? 2 : r.ef >= 20 ? 1 : 0
      };
    }).sort(function (a, b) { return (a.r.ef + a.r.er) - (b.r.ef + b.r.er); });
    pts.forEach(function (p, i) { p.i = i; });

    var pProg, lProg;
    try {
      pProg = program(gl, VS_POINT, FS_POINT);
      lProg = program(gl, VS_LINE, FS_LINE);
    } catch (e) {
      if (w.console) w.console.warn("field3d:", e.message);
      return null;
    }

    /* points buffer: x y z size kind idx */
    var pData = new Float32Array(pts.length * 6);
    pts.forEach(function (p, i) {
      pData.set([p.x, p.y, p.z, p.size, p.kind, p.i], i * 6);
    });
    var pBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, pBuf);
    gl.bufferData(gl.ARRAY_BUFFER, pData, gl.STATIC_DRAW);

    /* lines: floor grid (0), stems (1), threshold outlines (2) */
    var L = [];
    function seg(a, b, k) { L.push(a[0], a[1], a[2], k, b[0], b[1], b[2], k); }
    for (var gx = -1.7; gx <= 1.701; gx += 0.34) seg([gx, FLOOR, -ZS - 0.15], [gx, FLOOR, ZS + 0.15], 0);
    for (var gz = -ZS - 0.15; gz <= ZS + 0.151; gz += (2 * ZS + 0.3) / 8) seg([-1.7, FLOOR, gz], [1.7, FLOOR, gz], 0);
    pts.forEach(function (p) { seg([p.x, p.y, p.z], [p.x, FLOOR, p.z], 1); });
    var x20 = X(20), y20 = Y(20), zA = -ZS - 0.15, zB = ZS + 0.15;
    /* the vertical plane at e_fair = 20 */
    seg([x20, FLOOR, zA], [x20, 1.2, zA], 2); seg([x20, 1.2, zA], [x20, 1.2, zB], 2);
    seg([x20, 1.2, zB], [x20, FLOOR, zB], 2); seg([x20, FLOOR, zB], [x20, FLOOR, zA], 2);
    /* the horizontal plane at e_real = 20 */
    seg([-1.7, y20, zA], [1.75, y20, zA], 2); seg([1.75, y20, zA], [1.75, y20, zB], 2);
    seg([1.75, y20, zB], [-1.7, y20, zB], 2); seg([-1.7, y20, zB], [-1.7, y20, zA], 2);
    var lData = new Float32Array(L);
    var lBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, lBuf);
    gl.bufferData(gl.ARRAY_BUFFER, lData, gl.STATIC_DRAW);

    /* the two threshold planes as translucent quads (kind 3) */
    var Q = [];
    function quad(a, b, c, dd) { [a, b, c, a, c, dd].forEach(function (v) { Q.push(v[0], v[1], v[2], 3); }); }
    quad([x20, FLOOR, zA], [x20, 1.2, zA], [x20, 1.2, zB], [x20, FLOOR, zB]);
    quad([-1.7, y20, zA], [1.75, y20, zA], [1.75, y20, zB], [-1.7, y20, zB]);
    var qData = new Float32Array(Q);
    var qBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, qBuf);
    gl.bufferData(gl.ARRAY_BUFFER, qData, gl.STATIC_DRAW);

    var loc = {
      p: {
        aPos: gl.getAttribLocation(pProg, "aPos"), aSize: gl.getAttribLocation(pProg, "aSize"),
        aKind: gl.getAttribLocation(pProg, "aKind"), aIdx: gl.getAttribLocation(pProg, "aIdx"),
        uMVP: gl.getUniformLocation(pProg, "uMVP"), uZ: gl.getUniformLocation(pProg, "uZ"),
        uDpr: gl.getUniformLocation(pProg, "uDpr"), uReveal: gl.getUniformLocation(pProg, "uReveal"),
        uHover: gl.getUniformLocation(pProg, "uHover"), uCount: gl.getUniformLocation(pProg, "uCount"),
        uShift: gl.getUniformLocation(pProg, "uShift"), uShiftY: gl.getUniformLocation(pProg, "uShiftY"),
        uFoldP: gl.getUniformLocation(pProg, "uFoldP"),
        uInk: gl.getUniformLocation(pProg, "uInk"), uAcc: gl.getUniformLocation(pProg, "uAcc")
      },
      l: {
        aPos: gl.getAttribLocation(lProg, "aPos"), aKind: gl.getAttribLocation(lProg, "aKind"),
        uMVP: gl.getUniformLocation(lProg, "uMVP"), uZ: gl.getUniformLocation(lProg, "uZ"),
        uShift: gl.getUniformLocation(lProg, "uShift"), uShiftY: gl.getUniformLocation(lProg, "uShiftY"), uFold: gl.getUniformLocation(lProg, "uFold"),
        uReveal: gl.getUniformLocation(lProg, "uReveal"),
        uInk: gl.getUniformLocation(lProg, "uInk"), uAcc: gl.getUniformLocation(lProg, "uAcc"),
        uRule: gl.getUniformLocation(lProg, "uRule")
      }
    };

    /* ---------- state ---------- */
    var colours = {};
    function readColours() {
      var cs = getComputedStyle(canvas);
      colours.ink = rgbOf(cs.getPropertyValue("--ink").trim(), [0.94, 0.94, 0.92]);
      colours.acc = rgbOf(cs.getPropertyValue("--accent").trim(), [0.97, 0.84, 0.19]);
      colours.rule = rgbOf(cs.getPropertyValue("--rule").trim(), [0.22, 0.23, 0.25]);
    }
    readColours();

    var fold = 0, foldTarget = 0;
    var mx = 0, my = 0, smx = 0, smy = 0;
    var reveal = reduced ? 1 : 0, t0 = null;
    var hover = -1;
    var W = 1, H = 1, dpr = 1, mvp = null, shift = 0, shiftY = 0;
    var running = false, raf = null, visible = true;
    var labelsHost = opts.labels || null;

    function size() {
      dpr = Math.min(w.devicePixelRatio || 1, 2);
      W = canvas.clientWidth || 1; H = canvas.clientHeight || 1;
      var nw = Math.round(W * dpr), nh = Math.round(H * dpr);
      if (canvas.width !== nw || canvas.height !== nh) { canvas.width = nw; canvas.height = nh; }
      gl.viewport(0, 0, nw, nh);
    }

    function camera(time) {
      var f = ease(clamp(fold, 0, 1));
      var aspect = W / H;
      var wide = W >= 900;
      var spin = reduced ? 0 : time * 0.00006;
      var ang = lerp(-0.62 + spin + smx * 0.32, 0, f);
      var pitch = lerp(0.36 + smy * -0.14, 0, f);
      var fov = lerp(40, 16, f) * Math.PI / 180;
      /* the flat chart is framed into the right of the screen, leaving the header
         above it and the caption to its left */
      var tanH = Math.tan(fov / 2);
      var needH = 1.15 / 0.64, needW = 1.72 / (0.54 * aspect);
      var dFlat = Math.max(needH, needW) / tanH;
      var dist = lerp(wide ? 6.2 : 6.8, dFlat, f);
      var eye = [Math.sin(ang) * Math.cos(pitch) * dist, Math.sin(pitch) * dist, Math.cos(ang) * Math.cos(pitch) * dist];
      var target = [lerp(0.15, 0, f), lerp(-0.1, 0.05, f), 0];
      shift = wide ? lerp(0.44, 0.38, f) : 0;
      shiftY = wide ? lerp(-0.04, -0.02, f) : 0;
      mvp = mul(perspective(fov, aspect, 0.1, 60), lookAt(eye, target, [0, 1, 0]));
    }

    function project(x, y, z) {
      var m = mvp, zz = z * (1 - ease(clamp(fold, 0, 1)));
      var cx = m[0] * x + m[4] * y + m[8] * zz + m[12];
      var cy = m[1] * x + m[5] * y + m[9] * zz + m[13];
      var cw = m[3] * x + m[7] * y + m[11] * zz + m[15];
      if (cw <= 0) return null;
      return { x: ((cx / cw + shift) * 0.5 + 0.5) * W, y: (1 - ((cy / cw + shiftY) * 0.5 + 0.5)) * H };
    }

    function draw(time) {
      size();
      camera(time);
      var zMul = 1 - ease(clamp(fold, 0, 1));

      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.disable(gl.DEPTH_TEST);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

      /* planes, then lines */
      gl.useProgram(lProg);
      gl.uniformMatrix4fv(loc.l.uMVP, false, new Float32Array(mvp));
      gl.uniform1f(loc.l.uZ, zMul);
      gl.uniform1f(loc.l.uShift, shift);
      gl.uniform1f(loc.l.uShiftY, shiftY);
      gl.uniform1f(loc.l.uFold, ease(clamp(fold, 0, 1)));
      gl.uniform1f(loc.l.uReveal, clamp(reveal * 1.6, 0, 1));
      gl.uniform3fv(loc.l.uInk, colours.ink);
      gl.uniform3fv(loc.l.uAcc, colours.acc);
      gl.uniform3fv(loc.l.uRule, colours.rule);

      gl.bindBuffer(gl.ARRAY_BUFFER, qBuf);
      gl.enableVertexAttribArray(loc.l.aPos);
      gl.vertexAttribPointer(loc.l.aPos, 3, gl.FLOAT, false, 16, 0);
      gl.enableVertexAttribArray(loc.l.aKind);
      gl.vertexAttribPointer(loc.l.aKind, 1, gl.FLOAT, false, 16, 12);
      gl.drawArrays(gl.TRIANGLES, 0, qData.length / 4);

      gl.bindBuffer(gl.ARRAY_BUFFER, lBuf);
      gl.vertexAttribPointer(loc.l.aPos, 3, gl.FLOAT, false, 16, 0);
      gl.vertexAttribPointer(loc.l.aKind, 1, gl.FLOAT, false, 16, 12);
      gl.drawArrays(gl.LINES, 0, lData.length / 4);

      /* points */
      gl.useProgram(pProg);
      gl.uniformMatrix4fv(loc.p.uMVP, false, new Float32Array(mvp));
      gl.uniform1f(loc.p.uZ, zMul);
      gl.uniform1f(loc.p.uDpr, dpr);
      gl.uniform1f(loc.p.uReveal, reveal);
      gl.uniform1f(loc.p.uHover, hover);
      gl.uniform1f(loc.p.uCount, pts.length);
      gl.uniform1f(loc.p.uShift, shift);
      gl.uniform1f(loc.p.uShiftY, shiftY);
      gl.uniform1f(loc.p.uFoldP, ease(clamp(fold, 0, 1)));
      gl.uniform3fv(loc.p.uInk, colours.ink);
      gl.uniform3fv(loc.p.uAcc, colours.acc);
      gl.bindBuffer(gl.ARRAY_BUFFER, pBuf);
      var S = 24;
      gl.enableVertexAttribArray(loc.p.aPos); gl.vertexAttribPointer(loc.p.aPos, 3, gl.FLOAT, false, S, 0);
      gl.enableVertexAttribArray(loc.p.aSize); gl.vertexAttribPointer(loc.p.aSize, 1, gl.FLOAT, false, S, 12);
      gl.enableVertexAttribArray(loc.p.aKind); gl.vertexAttribPointer(loc.p.aKind, 1, gl.FLOAT, false, S, 16);
      gl.enableVertexAttribArray(loc.p.aIdx); gl.vertexAttribPointer(loc.p.aIdx, 1, gl.FLOAT, false, S, 20);
      gl.drawArrays(gl.POINTS, 0, pts.length);

      placeLabels();
    }

    /* axis labels for the flat state, projected from the same camera */
    var labelEls = null;
    function buildLabels() {
      if (!labelsHost) return;
      labelsHost.innerHTML = "";
      labelEls = [];
      function add(txt, x, y, z, cls) {
        var el = document.createElement("span");
        el.className = "fl " + (cls || "");
        el.textContent = txt;
        labelsHost.appendChild(el);
        labelEls.push({ el: el, x: x, y: y, z: z, rot: /fl--rot/.test(cls || "") });
      }
      [0.01, 0.1, 1, 10, 100].forEach(function (t) { add(t === 0.01 ? "≤0.01" : String(t), X(t), -1.26, 0, "fl--x"); });
      [0.01, 0.1, 1, 10].forEach(function (t) { add(t === 0.01 ? "≤0.01" : String(t), -1.78, Y(t), 0, "fl--y"); });
      add("e = 20", x20, 1.28, 0, "fl--thr");
      add("e = 20 after the margin", -1.65, y20 + 0.1, 0, "fl--thr fl--left");
      add("e-value at fair odds →", 1.7, -1.42, 0, "fl--axis fl--right");
      add("after the book's margin →", -2.05, -0.2, 0, "fl--axis fl--rot");
    }
    function placeLabels() {
      if (!labelEls) return;
      var on = clamp((ease(clamp(fold, 0, 1)) - 0.6) / 0.35, 0, 1);
      labelsHost.style.opacity = on.toFixed(3);
      if (on <= 0) return;
      labelEls.forEach(function (l) {
        var p = project(l.x, l.y, l.z);
        if (!p) return;
        l.el.style.transform = "translate3d(" + p.x.toFixed(1) + "px," + p.y.toFixed(1) + "px,0)" +
          (l.rot ? " translate(-50%,-50%) rotate(-90deg)" : "");
      });
    }
    buildLabels();

    function loop(time) {
      raf = null;
      if (!running) return;
      if (t0 == null) t0 = time;
      if (reveal < 1) reveal = clamp((time - t0) / 2400, 0, 1);
      smx += (mx - smx) * 0.05;
      smy += (my - smy) * 0.05;
      fold += (foldTarget - fold) * (reduced ? 1 : 0.12);
      draw(time);
      raf = w.requestAnimationFrame(loop);
    }
    function start() {
      if (running) return;
      running = true;
      raf = w.requestAnimationFrame(loop);
    }
    function stop() {
      running = false;
      if (raf) { w.cancelAnimationFrame(raf); raf = null; }
    }

    /* only spend frames while the hero is on screen and the tab is visible */
    if ("IntersectionObserver" in w) {
      new IntersectionObserver(function (e) {
        visible = e[0].isIntersecting;
        if (visible && !document.hidden) start(); else stop();
      }, { threshold: 0 }).observe(canvas);
    }
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) stop(); else if (visible) start();
    });

    canvas.addEventListener("webglcontextlost", function (e) { e.preventDefault(); stop(); });

    function pointer(clientX, clientY) {
      var r = canvas.getBoundingClientRect();
      mx = ((clientX - r.left) / r.width) * 2 - 1;
      my = ((clientY - r.top) / r.height) * 2 - 1;
    }

    function read(clientX, clientY) {
      if (!mvp) return null;
      var r = canvas.getBoundingClientRect();
      var x = clientX - r.left, y = clientY - r.top;
      if (x < 0 || y < 0 || x > r.width || y > r.height) { hover = -1; return null; }
      var best = null, bestD = 18;
      pts.forEach(function (p) {
        if (p.i > reveal * (pts.length + 24)) return;
        var s = project(p.x, p.y, p.z);
        if (!s) return;
        var dd = Math.hypot(s.x - x, s.y - y);
        if (dd < bestD) { bestD = dd; best = p; }
      });
      hover = best ? best.i : -1;
      if (!best) return null;
      var fam = best.r.f.replace(/_/g, " ");
      function f(v) { return v >= 10 ? v.toFixed(1) : v >= 1 ? v.toFixed(2) : v.toFixed(3); }
      return { x: fam + "  e " + f(best.r.ef), y: f(best.r.er) + " after margin, " + best.r.n + " bouts" };
    }

    return {
      run: function () { start(); },
      redraw: function () { readColours(); if (!running) draw(performance.now()); },
      setFold: function (v) { foldTarget = clamp(v, 0, 1); if (!running) { fold = foldTarget; draw(performance.now()); } },
      pointer: pointer,
      read: read,
      is3d: true
    };
  }

  w.RPField3D = field3d;
})(window);
