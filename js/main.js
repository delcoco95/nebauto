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

  document.addEventListener("DOMContentLoaded", () => {
    applyConfig();
    initHeaderScroll();
    initHeroParallax();
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
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

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
