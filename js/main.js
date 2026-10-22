(function () {
  "use strict";

  /**
   * Single place to edit NEBAUTO's real contact details / region.
   * Everything with data-phone-text / data-email-text / data-zone-* in the
   * HTML is filled in from here at load time.
   */
  const CONFIG = {
    email: "nebauto@gmail.com",
    city: "région parisienne",
    region: "Île-de-France",
    coords: { lat: 48.8566, lon: 2.3522 },
  };

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hasFinePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const saveData = !!(navigator.connection && navigator.connection.saveData);

  document.addEventListener("DOMContentLoaded", () => {
    applyConfig();
    initHeaderScroll();
    initHeroParallax();
    initLazyVideos();
    initScrollEffects();
    initServicePreview();
    initMagneticButtons();
    initNavOverlay();
    initModal();
    initFaq();
    initGallery();
    initReveal();
    initSmoothAnchors();
    initGlobe();
    initYear();
    registerServiceWorker();
  });

  function applyConfig() {
    document.querySelectorAll("[data-email-text]").forEach((el) => (el.textContent = CONFIG.email));
    document.querySelectorAll("[data-email-link]").forEach((el) => el.setAttribute("href", "mailto:" + CONFIG.email));
    document.querySelectorAll("[data-zone-city]").forEach((el) => (el.textContent = CONFIG.city));
    document.querySelectorAll("[data-zone-region]").forEach((el) => (el.textContent = CONFIG.region));
  }

  function initYear() {
    const el = document.getElementById("year");
    if (el) el.textContent = new Date().getFullYear();
  }

  /* ---------------- Header scroll state (pill + hide-on-scroll-down) ---------------- */
  function initHeaderScroll() {
    const header = document.getElementById("siteHeader");
    if (!header) return;

    let lastY = window.scrollY;

    const onScroll = () => {
      const y = window.scrollY;
      header.classList.toggle("is-scrolled", y > 40);

      const scrollingDown = y > lastY;
      const pastThreshold = y > 160;
      const navOrModalOpen = document.body.classList.contains("nav-open");

      if (!navOrModalOpen) {
        header.classList.toggle("is-hidden", scrollingDown && pastThreshold);
      }
      lastY = y;
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ---------------- Hero parallax (background drifts slower than scroll) ---------------- */
  function initHeroParallax() {
    const hero = document.querySelector(".hero");
    const media = document.querySelector(".hero-media");
    if (!hero || !media) return;
    if (prefersReducedMotion) return;

    let ticking = false;
    function update() {
      const heroHeight = hero.offsetHeight;
      const y = Math.min(window.scrollY, heroHeight);
      media.style.transform = "translateY(" + y * 0.12 + "px)";
      ticking = false;
    }
    window.addEventListener(
      "scroll",
      () => {
        if (!ticking) {
          requestAnimationFrame(update);
          ticking = true;
        }
      },
      { passive: true }
    );
  }

  /* ---------------- Background videos: loaded only near the viewport, paused off-screen ---------------- */
  function initLazyVideos() {
    const videos = document.querySelectorAll("video[data-video-lazy]");
    if (!videos.length || prefersReducedMotion || saveData || !("IntersectionObserver" in window)) return;

    const small = window.matchMedia("(max-width: 760px)").matches;

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const video = entry.target;
          if (entry.isIntersecting) {
            if (!video.dataset.loaded) {
              video.dataset.loaded = "1";
              video.muted = true;
              video.src = (small && video.dataset.srcSmall) || video.dataset.src;
              video.addEventListener("playing", () => video.classList.add("is-playing"), { once: true });
            }
            const p = video.play();
            if (p && p.catch) p.catch(() => {});
          } else if (video.dataset.loaded) {
            video.pause();
          }
        });
      },
      { rootMargin: "200px 0px" }
    );
    videos.forEach((v) => io.observe(v));

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) videos.forEach((v) => v.pause());
    });
  }

  /* ---------------- Scroll-linked effects (one rAF-throttled listener) ---------------- */
  function initScrollEffects() {
    const tasks = [];
    const progress = document.getElementById("scrollProgress");
    if (progress) {
      tasks.push(() => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        progress.style.transform = "scaleX(" + (max > 0 ? window.scrollY / max : 0) + ")";
      });
    }

    document.querySelectorAll("[data-scroll-words]").forEach((el) => {
      const words = splitWords(el);
      if (prefersReducedMotion) {
        words.forEach((w) => w.classList.add("is-lit"));
        return;
      }
      tasks.push(() => {
        const vh = window.innerHeight;
        const rect = el.getBoundingClientRect();
        const p = clamp((vh * 0.85 - rect.top) / (rect.height + vh * 0.35), 0, 1);
        const lit = Math.round(p * words.length);
        words.forEach((w, i) => w.classList.toggle("is-lit", i < lit));
      });
    });

    const film = document.querySelector(".film-frame");
    if (film && !prefersReducedMotion) {
      tasks.push(() => {
        const vh = window.innerHeight;
        const rect = film.getBoundingClientRect();
        if (rect.bottom < 0 || rect.top > vh) return;
        const p = clamp((vh - rect.top) / (vh * 1.1), 0, 1);
        film.style.setProperty("--inset", (1 - easeOut(p)).toFixed(4));
      });
    }

    if (!tasks.length) return;
    let ticking = false;
    const run = () => {
      tasks.forEach((t) => t());
      ticking = false;
    };
    const request = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(run);
      }
    };
    run();
    window.addEventListener("scroll", request, { passive: true });
    window.addEventListener("resize", request);
  }

  function splitWords(root) {
    const words = [];
    Array.from(root.childNodes).forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const frag = document.createDocumentFragment();
        node.textContent.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) {
            frag.appendChild(document.createTextNode(part));
            return;
          }
          const span = document.createElement("span");
          span.className = "w";
          span.textContent = part;
          frag.appendChild(span);
          words.push(span);
        });
        node.replaceWith(frag);
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        words.push(...splitWords(node));
      }
    });
    return words;
  }

  function clamp(v, min, max) {
    return Math.min(max, Math.max(min, v));
  }

  function easeOut(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  /* ---------------- Services: image preview that follows the cursor (desktop only) ---------------- */
  function initServicePreview() {
    const list = document.querySelector(".service-list");
    if (!list || !hasFinePointer || prefersReducedMotion) return;
    const items = Array.from(list.querySelectorAll("li[data-preview]"));
    if (!items.length) return;

    const preview = document.createElement("div");
    preview.className = "service-preview";
    preview.setAttribute("aria-hidden", "true");
    const imgs = items.map((li) => {
      const img = document.createElement("img");
      img.alt = "";
      img.decoding = "async";
      img.dataset.src = li.dataset.preview;
      preview.appendChild(img);
      return img;
    });
    document.body.appendChild(preview);

    let x = 0, y = 0, tx = 0, ty = 0, rafId = null, active = false;
    const w = 260, h = 325;

    const loop = () => {
      x += (tx - x) * 0.14;
      y += (ty - y) * 0.14;
      preview.style.transform = "translate(" + (x - w / 2) + "px," + (y - h / 2) + "px) rotate(" + clamp((tx - x) * 0.04, -6, 6) + "deg)";
      if (active || Math.abs(tx - x) > 0.5 || Math.abs(ty - y) > 0.5) rafId = requestAnimationFrame(loop);
      else rafId = null;
    };
    const kick = () => {
      if (!rafId) rafId = requestAnimationFrame(loop);
    };

    list.addEventListener("pointerenter", (e) => {
      imgs.forEach((img) => {
        if (!img.src) img.src = img.dataset.src;
      });
      x = tx = e.clientX;
      y = ty = e.clientY;
    });
    list.addEventListener("pointermove", (e) => {
      tx = e.clientX;
      ty = e.clientY;
      kick();
    });
    items.forEach((li, i) => {
      li.addEventListener("pointerenter", () => {
        imgs.forEach((img, j) => img.classList.toggle("is-current", i === j));
        active = true;
        preview.classList.add("is-active");
        kick();
      });
    });
    list.addEventListener("pointerleave", () => {
      active = false;
      preview.classList.remove("is-active");
    });
  }

  /* ---------------- Magnetic buttons (subtle pull toward the cursor, desktop only) ---------------- */
  function initMagneticButtons() {
    if (!hasFinePointer || prefersReducedMotion) return;
    document.querySelectorAll(".btn-line").forEach((btn) => {
      btn.addEventListener("pointermove", (e) => {
        const r = btn.getBoundingClientRect();
        const dx = (e.clientX - r.left - r.width / 2) * 0.16;
        const dy = (e.clientY - r.top - r.height / 2) * 0.28;
        btn.style.translate = dx.toFixed(1) + "px " + dy.toFixed(1) + "px";
      });
      btn.addEventListener("pointerleave", () => {
        btn.style.translate = "";
      });
    });
  }

  /* ---------------- Fullscreen nav overlay ---------------- */
  function initNavOverlay() {
    const trigger = document.getElementById("menuTrigger");
    const overlay = document.getElementById("navOverlay");
    if (!trigger || !overlay) return;

    function open() {
      overlay.classList.add("is-open");
      overlay.setAttribute("aria-hidden", "false");
      trigger.setAttribute("aria-expanded", "true");
      document.body.classList.add("nav-open");
    }
    function close() {
      overlay.classList.remove("is-open");
      overlay.setAttribute("aria-hidden", "true");
      trigger.setAttribute("aria-expanded", "false");
      document.body.classList.remove("nav-open");
    }

    trigger.addEventListener("click", () => {
      overlay.classList.contains("is-open") ? close() : open();
    });
    overlay.querySelectorAll("a, button").forEach((el) => el.addEventListener("click", close));
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && overlay.classList.contains("is-open")) close();
    });
  }

  /* ---------------- Contact modal ---------------- */
  function initModal() {
    const overlay = document.getElementById("contactOverlay");
    if (!overlay) return;
    const form = document.getElementById("contactForm");
    const success = document.getElementById("formSuccess");
    const openers = document.querySelectorAll("[data-open-contact]");
    const closers = overlay.querySelectorAll("[data-close-contact]");
    let lastFocused = null;

    function open() {
      lastFocused = document.activeElement;
      overlay.classList.add("is-open");
      overlay.setAttribute("aria-hidden", "false");
      document.body.classList.add("nav-open");
      const firstField = form ? form.querySelector("input, select, textarea") : null;
      if (firstField) setTimeout(() => firstField.focus(), 260);
    }
    function close() {
      overlay.classList.remove("is-open");
      overlay.setAttribute("aria-hidden", "true");
      document.body.classList.remove("nav-open");
      if (lastFocused) lastFocused.focus();
      setTimeout(() => {
        if (form) {
          form.hidden = false;
          form.reset();
        }
        if (success) success.hidden = true;
      }, 300);
    }

    openers.forEach((btn) => btn.addEventListener("click", open));
    closers.forEach((btn) => btn.addEventListener("click", close));
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) close();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && overlay.classList.contains("is-open")) close();
    });

    if (form) {
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        if (!form.checkValidity()) {
          form.reportValidity();
          return;
        }
        // No backend wired yet: front-end only confirmation.
        // Replace this block with a fetch() to your form endpoint / email service.
        form.hidden = true;
        if (success) success.hidden = false;
      });
    }
  }

  /* ---------------- FAQ accordion ---------------- */
  function initFaq() {
    const items = document.querySelectorAll(".faq-item");
    items.forEach((item) => {
      const btn = item.querySelector(".faq-question");
      const answer = item.querySelector(".faq-answer");
      if (!btn || !answer) return;
      btn.addEventListener("click", () => {
        const isOpen = btn.getAttribute("aria-expanded") === "true";
        items.forEach((other) => {
          if (other === item) return;
          other.querySelector(".faq-question").setAttribute("aria-expanded", "false");
          other.querySelector(".faq-answer").style.maxHeight = null;
        });
        btn.setAttribute("aria-expanded", String(!isOpen));
        answer.style.maxHeight = isOpen ? null : answer.scrollHeight + "px";
      });
    });
  }

  /* ---------------- Selection marquee (continuous auto-scroll) ---------------- */
  function initGallery() {
    const track = document.getElementById("selTrack");
    if (!track) return;
    // Duplicate the set once so the CSS animation (translateX -50%) loops seamlessly.
    const cards = Array.from(track.children);
    cards.forEach((card) => track.appendChild(card.cloneNode(true)));
  }

  /* ---------------- Reveal on scroll ---------------- */
  function initReveal() {
    const items = document.querySelectorAll("[data-reveal]");
    if (!items.length) return;
    if (!("IntersectionObserver" in window)) {
      items.forEach((el) => el.classList.add("is-visible"));
      return;
    }
    const io = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -60px 0px" }
    );
    items.forEach((el) => io.observe(el));

    // Catch-up: a fast scroll or an anchor jump can carry an element past the viewport
    // without the observer ever reporting it, which would leave it invisible for good.
    let pending = Array.from(items);
    let ticking = false;
    const catchUp = () => {
      ticking = false;
      const limit = window.innerHeight;
      pending = pending.filter((el) => {
        if (el.classList.contains("is-visible")) return false;
        if (el.getBoundingClientRect().top < limit) {
          el.classList.add("is-visible");
          io.unobserve(el);
          return false;
        }
        return true;
      });
      if (!pending.length) window.removeEventListener("scroll", onScroll);
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        setTimeout(catchUp, 150);
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    setTimeout(catchUp, 600);
  }

  /* ---------------- Smooth anchor scrolling (fixed header offset) ---------------- */
  function initSmoothAnchors() {
    document.querySelectorAll('a[href^="#"]').forEach((link) => {
      link.addEventListener("click", (e) => {
        const id = link.getAttribute("href");
        if (!id || id.length < 2) return;
        const target = document.querySelector(id);
        if (!target) return;
        e.preventDefault();
        target.scrollIntoView({ behavior: "smooth", block: "start" });
        history.pushState(null, "", id);
      });
    });
  }

  /* ---------------- Globe ---------------- */
  function initGlobe() {
    const canvas = document.getElementById("globeCanvas");
    if (!canvas || !window.NebautoGlobe) return;
    window.NebautoGlobe.init(canvas, {
      lat: CONFIG.coords.lat,
      lon: CONFIG.coords.lon,
      dotColor: [244, 242, 238],
      markerColor: [167, 180, 129],
      markerGlow: [205, 214, 172],
    });
  }

  /* ---------------- PWA service worker ---------------- */
  function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) return;
    if (location.protocol === "file:") return;
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").catch(() => {});
    });
  }
})();
