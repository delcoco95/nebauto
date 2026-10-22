/**
 * NEBAUTO — motion design layer.
 * anime.js drives SVG / text / scroll-synced work, Motion drives spring physics.
 * Both libraries are loaded after the page is interactive, so a slow or failing CDN
 * never delays or breaks the site: every effect below is a progressive enhancement.
 */
(function () {
  "use strict";

  const LIBS = {
    anime: "https://cdn.jsdelivr.net/npm/animejs@4.5.0/dist/bundles/anime.umd.min.js",
    motion: "https://cdn.jsdelivr.net/npm/motion@13.5.1/dist/motion.js",
  };

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hasFinePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const SVG_NS = "http://www.w3.org/2000/svg";

  document.addEventListener("DOMContentLoaded", () => {
    if (prefersReducedMotion) return;

    loadScript(LIBS.anime)
      .then(() => {
        const A = window.anime;
        if (!A) return;
        initParcours(A);
        initHeadings(A);
      })
      .catch(() => {});

    loadScript(LIBS.motion)
      .then(() => {
        const M = window.Motion;
        if (!M) return;
        initServiceRows(M);
        initBudgetCounter(M);
        if (hasFinePointer) initCardTilt(M);
      })
      .catch(() => {});
  });

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src;
      s.async = true;
      s.crossOrigin = "anonymous";
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  /**
   * Runs `cb` once `el` carries .is-visible (set by main.js's reveal system, which
   * includes a catch-up for fast scrolls), so an effect can never leave text hidden.
   */
  function whenRevealed(el, cb) {
    if (el.classList.contains("is-visible")) {
      cb();
      return;
    }
    const mo = new MutationObserver(() => {
      if (el.classList.contains("is-visible")) {
        mo.disconnect();
        cb();
      }
    });
    mo.observe(el, { attributes: true, attributeFilter: ["class"] });
  }

  /* ---------------- anime.js: road drawn by scroll, car following the path ---------------- */
  function initParcours(A) {
    const section = document.getElementById("parcours");
    if (!section) return;
    const path = section.querySelector("#roadPath");
    const car = section.querySelector("#roadCar");
    const stopsGroup = section.querySelector(".road-stops");
    const steps = Array.from(section.querySelectorAll(".parcours-steps li"));
    if (!path || !car || !steps.length) return;

    const total = path.getTotalLength();
    const marks = steps.map((_, i) => i / (steps.length - 1));
    const stops = marks.map((m) => {
      const pt = path.getPointAtLength(m * total);
      const c = document.createElementNS(SVG_NS, "circle");
      c.setAttribute("class", "road-stop");
      c.setAttribute("cx", pt.x.toFixed(1));
      c.setAttribute("cy", pt.y.toFixed(1));
      c.setAttribute("r", "8");
      stopsGroup.appendChild(c);
      return c;
    });

    section.classList.add("is-enhanced");

    let lastIndex = -2;
    const update = (progress) => {
      let index = -1;
      marks.forEach((m, i) => {
        if (progress >= m - 0.015) index = i;
      });
      if (index === lastIndex) return;
      lastIndex = index;
      steps.forEach((li, i) => {
        li.classList.toggle("is-reached", i <= index);
        li.classList.toggle("is-current", i === index);
      });
      stops.forEach((c, i) => c.classList.toggle("is-reached", i <= index));
    };

    const [road] = A.svg.createDrawable(path);
    const motionPath = A.svg.createMotionPath(path);

    A.createTimeline({
      defaults: { ease: "linear", duration: 1000 },
      // The section is 300vh with a sticky stage: progress runs while the stage is pinned.
      autoplay: A.onScroll({
        target: section,
        enter: "top top",
        leave: "bottom bottom",
        sync: 0.85,
      }),
      onUpdate: (tl) => update(tl.progress),
    })
      .add(road, { draw: ["0 0", "0 1"] }, 0)
      .add(car, Object.assign({}, motionPath), 0);

    update(0);
  }

  /* ---------------- anime.js: section titles rise word by word ---------------- */
  function initHeadings(A) {
    document.querySelectorAll("[data-reveal] h2, h2[data-reveal]").forEach((h2) => {
      const trigger = h2.hasAttribute("data-reveal") ? h2 : h2.closest("[data-reveal]");
      const split = A.splitText(h2, { words: { wrap: "clip" } });
      if (!split.words || !split.words.length) return;
      A.set(split.words, { y: "105%" });
      whenRevealed(trigger, () => {
        A.animate(split.words, {
          y: ["105%", "0%"],
          duration: 1100,
          delay: A.stagger(70, { start: 120 }),
          ease: "outExpo",
        });
      });
    });
  }

  /* ---------------- Motion: service rows enter with a spring stagger ---------------- */
  function initServiceRows(M) {
    const list = document.querySelector(".service-list");
    const label = document.querySelector("#services .section-label");
    if (!list || !label) return;
    const rows = Array.from(list.children);
    M.animate(rows, { opacity: 0, y: 34 }, { duration: 0 });
    whenRevealed(label, () => {
      M.animate(
        rows,
        { opacity: [0, 1], y: [34, 0] },
        { type: "spring", stiffness: 140, damping: 18, delay: M.stagger(0.08, { startDelay: 0.15 }) }
      );
    });
  }

  /* ---------------- Motion: 3D tilt that follows the pointer, spring-damped ---------------- */
  function initCardTilt(M) {
    const viewport = document.querySelector(".selection-viewport");
    if (!viewport) return;
    const spring = { type: "spring", stiffness: 260, damping: 20, mass: 0.6 };
    let active = null;

    viewport.addEventListener("pointermove", (e) => {
      const card = e.target.closest(".selection-card");
      if (!card) return;
      if (active && active !== card) reset(active);
      active = card;
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      M.animate(card, { rotateY: px * 14, rotateX: -py * 12, scale: 1.03, transformPerspective: 900 }, spring);
    });
    viewport.addEventListener("pointerleave", () => {
      if (active) reset(active);
      active = null;
    });

    function reset(card) {
      M.animate(card, { rotateY: 0, rotateX: 0, scale: 1 }, spring);
    }
  }

  /* ---------------- Motion: budget figure counts to its new value ---------------- */
  function initBudgetCounter(M) {
    const range = document.getElementById("ff-budget");
    const out = document.getElementById("ff-budget-out");
    if (!range || !out) return;
    const max = Number(range.max);
    let shown = Number(range.value);
    let running = null;

    const format = (v, target) =>
      (Math.round(v / 100) * 100).toLocaleString("fr-FR") + " €" + (target >= max && v >= max ? " et +" : "");

    // Registered after main.js's listener, so this repaint wins over its instant text update.
    range.addEventListener("input", () => {
      const target = Number(range.value);
      if (running) running.stop();
      out.textContent = format(shown, target);
      running = M.animate(shown, target, {
        type: "spring",
        stiffness: 180,
        damping: 26,
        onUpdate: (v) => {
          shown = v;
          out.textContent = format(v, target);
        },
        onComplete: () => {
          shown = target;
          out.textContent = format(target, target);
        },
      });
    });
    // A form reset jumps back to the default value without animating.
    range.form &&
      range.form.addEventListener("reset", () => {
        if (running) running.stop();
        setTimeout(() => (shown = Number(range.value)));
      });
  }
})();
