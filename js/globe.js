/**
 * NEBAUTO — dotted globe (canvas 2D, no dependencies).
 * Renders a partial sphere of points, auto-rotating, with one highlighted
 * marker for the company's region (lat/lon in degrees).
 */
(function () {
  "use strict";

  function fibonacciSphere(count) {
    const points = [];
    const offset = 2 / count;
    const increment = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < count; i++) {
      const y = i * offset - 1 + offset / 2;
      const r = Math.sqrt(Math.max(0, 1 - y * y));
      const phi = i * increment;
      points.push({ x: Math.cos(phi) * r, y: y, z: Math.sin(phi) * r });
    }
    return points;
  }

  function latLonToVector(latDeg, lonDeg) {
    const lat = (latDeg * Math.PI) / 180;
    const lon = (lonDeg * Math.PI) / 180;
    return {
      x: Math.cos(lat) * Math.sin(lon),
      y: Math.sin(lat),
      z: Math.cos(lat) * Math.cos(lon),
    };
  }

  function rotateY(p, angle) {
    const cos = Math.cos(angle), sin = Math.sin(angle);
    return { x: p.x * cos + p.z * sin, y: p.y, z: -p.x * sin + p.z * cos };
  }

  function rotateX(p, angle) {
    const cos = Math.cos(angle), sin = Math.sin(angle);
    return { x: p.x, y: p.y * cos - p.z * sin, z: p.y * sin + p.z * cos };
  }

  function init(canvas, opts) {
    if (!canvas || !canvas.getContext) return null;
    const ctx = canvas.getContext("2d");
    const settings = Object.assign(
      {
        pointCount: 760,
        tilt: -14,
        rotationSpeed: 0.0016,
        dotColor: [245, 243, 239],
        markerColor: [255, 90, 31],
        markerGlow: [255, 179, 71],
        lat: 43.6047,
        lon: 1.4442,
      },
      opts || {}
    );

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const points = fibonacciSphere(settings.pointCount);
    const marker = latLonToVector(settings.lat, settings.lon);

    let angle = 0;
    let width = 0, height = 0, radius = 0, dpr = 1;
    let running = false;
    let rafId = null;
    let visible = true;

    function resize() {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      radius = Math.min(width, height) * 0.42;
    }

    function project(p) {
      const scale = 1.15;
      return {
        x: width / 2 + p.x * radius * scale,
        y: height / 2 + p.y * radius * scale,
        z: p.z,
      };
    }

    function drawFrame() {
      ctx.clearRect(0, 0, width, height);

      const tiltRad = (settings.tilt * Math.PI) / 180;

      // outer rim
      ctx.beginPath();
      ctx.arc(width / 2, height / 2, radius * 1.16, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255,255,255,0.08)";
      ctx.lineWidth = 1;
      ctx.stroke();

      const projected = points.map((p) => {
        const r = rotateX(rotateY(p, angle), tiltRad);
        return { ref: r, pt: project(r) };
      });
      projected.sort((a, b) => a.ref.z - b.ref.z);

      projected.forEach(({ ref, pt }) => {
        const depth = (ref.z + 1) / 2; // 0 back .. 1 front
        if (depth < 0.08) return;
        const alpha = 0.12 + depth * 0.62;
        const size = 0.7 + depth * 1.6;
        const [r, g, b] = settings.dotColor;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r},${g},${b},${alpha.toFixed(3)})`;
        ctx.fill();
      });

      // marker
      const mRef = rotateX(rotateY(marker, angle), tiltRad);
      const mPt = project(mRef);
      const mDepth = (mRef.z + 1) / 2;
      if (mDepth > 0.1) {
        const pulse = (Math.sin(Date.now() / 480) + 1) / 2;
        const [gr, gg, gb] = settings.markerGlow;
        const [pr, pg, pb] = settings.markerColor;

        ctx.beginPath();
        ctx.arc(mPt.x, mPt.y, 10 + pulse * 10, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${gr},${gg},${gb},${(0.22 * mDepth).toFixed(3)})`;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(mPt.x, mPt.y, 4.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${pr},${pg},${pb},${mDepth.toFixed(3)})`;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(mPt.x, mPt.y, 4.5, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${gr},${gg},${gb},${(0.9 * mDepth).toFixed(3)})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }

    function loop() {
      if (!running) return;
      angle += settings.rotationSpeed;
      drawFrame();
      rafId = requestAnimationFrame(loop);
    }

    function start() {
      if (running || !visible) return;
      running = true;
      if (reduceMotion) {
        drawFrame();
        running = false;
        return;
      }
      rafId = requestAnimationFrame(loop);
    }

    function stop() {
      running = false;
      if (rafId) cancelAnimationFrame(rafId);
    }

    resize();
    drawFrame();

    window.addEventListener("resize", () => {
      resize();
      drawFrame();
    });

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) stop();
      else start();
    });

    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            visible = entry.isIntersecting;
            if (visible) start();
            else stop();
          });
        },
        { threshold: 0.05 }
      );
      io.observe(canvas);
    } else {
      start();
    }

    return { start, stop, resize };
  }

  window.NebautoGlobe = { init: init };
})();
