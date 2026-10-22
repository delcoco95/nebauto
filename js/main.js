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
    // FormSubmit AJAX endpoint: every questionnaire / contact request is emailed to this inbox.
    // Once activated, the address can be replaced by the random alias FormSubmit provides
    // so the inbox stays out of the public source. Empty = fall back to a pre-filled email.
    formEndpoint: "https://formsubmit.co/ajax/nedjpro06@gmail.com",
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
    initMagneticButtons();
    initFinder();
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

  /* ---------------- Sourcing questionnaire (3 steps) ---------------- */
  function initFinder() {
    const form = document.getElementById("finderForm");
    if (!form) return;
    const steps = Array.from(form.querySelectorAll(".finder-step"));
    const card = form.closest(".finder-card");
    const bar = document.getElementById("finderBar");
    const count = document.getElementById("finderCount");
    const back = document.getElementById("finderBack");
    const next = document.getElementById("finderNext");
    const submit = document.getElementById("finderSubmit");
    const status = document.getElementById("finderStatus");
    const success = document.getElementById("finderSuccess");
    const successText = document.getElementById("finderSuccessText");
    const restart = document.getElementById("finderRestart");
    let current = 0;

    const yearSelect = form.querySelector("#ff-year");
    const thisYear = new Date().getFullYear();
    yearSelect.add(new Option("Peu importe", "Peu importe"));
    for (let y = thisYear; y >= thisYear - 15; y--) yearSelect.add(new Option(String(y), String(y)));

    const range = form.querySelector("#ff-budget");
    const rangeOut = form.querySelector("#ff-budget-out");
    const formatBudget = () => {
      const v = Number(range.value);
      return v.toLocaleString("fr-FR") + " €" + (v >= Number(range.max) ? " et +" : "");
    };
    const syncBudget = () => {
      rangeOut.textContent = formatBudget();
      const pct = ((range.value - range.min) / (range.max - range.min)) * 100;
      range.style.background = "linear-gradient(90deg, var(--accent) " + pct + "%, var(--line) " + pct + "%)";
    };
    range.addEventListener("input", syncBudget);
    syncBudget();

    const vehicle = initVehiclePicker(form);

    function show(i) {
      current = i;
      steps.forEach((s, j) => s.classList.toggle("is-active", i === j));
      const last = i === steps.length - 1;
      back.hidden = i === 0;
      next.hidden = last;
      submit.hidden = !last;
      bar.style.width = ((i + 1) / steps.length) * 100 + "%";
      count.textContent = "Étape " + (i + 1) + " sur " + steps.length;
      status.textContent = "";
      if (card.getBoundingClientRect().top < 0) card.scrollIntoView({ behavior: "smooth", block: "start" });
      const first = steps[i].querySelector("input:not([type=hidden]), select, textarea");
      if (first && hasFinePointer) first.focus({ preventScroll: true });
    }

    function setError(name, on) {
      const msg = form.querySelector('[data-error-for="' + name + '"]');
      if (msg) msg.classList.toggle("is-shown", on);
      const input = form.querySelector('[name="' + name + '"]');
      const field = input && input.closest(".field");
      if (field) field.classList.toggle("has-error", on);
    }

    function validateStep(step) {
      let firstInvalid = null;
      const seen = new Set();
      step.querySelectorAll("[required]").forEach((input) => {
        if (seen.has(input.name)) return;
        seen.add(input.name);
        let ok;
        if (input.type === "radio") ok = !!step.querySelector('input[name="' + input.name + '"]:checked');
        else if (input.type === "checkbox") ok = input.checked;
        else ok = input.value.trim() !== "" && input.checkValidity();
        setError(input.name, !ok);
        if (!ok && !firstInvalid) firstInvalid = input;
      });
      if (firstInvalid) firstInvalid.focus();
      return !firstInvalid;
    }

    // Clear an error as soon as the visitor fixes the field.
    form.addEventListener("input", (e) => {
      if (e.target.name) setError(e.target.name, false);
    });
    form.addEventListener("change", (e) => {
      if (e.target.name) setError(e.target.name, false);
    });

    next.addEventListener("click", () => {
      if (validateStep(steps[current])) show(current + 1);
    });
    back.addEventListener("click", () => show(current - 1));

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      // Enter in a text field on an intermediate step means "continue", not "send".
      if (current < steps.length - 1) {
        if (validateStep(steps[current])) show(current + 1);
        return;
      }
      if (!validateStep(steps[current])) return;

      const data = collect();
      submit.disabled = true;
      status.textContent = "Envoi en cours...";
      const result = await sendRequest("Recherche véhicule — " + data["Nom"], data, data["Email"]);
      submit.disabled = false;
      status.textContent = "";

      if (result === "error") {
        status.textContent = "L'envoi a échoué. Réessayez ou écrivez-nous à " + CONFIG.email + ".";
        return;
      }
      successText.textContent =
        result === "mail"
          ? "Votre messagerie s'est ouverte avec la demande pré-remplie : il ne reste qu'à l'envoyer. Nous revenons vers vous sous 48 h ouvrées."
          : "Nous revenons vers vous sous 48 h ouvrées avec une première sélection.";
      form.hidden = true;
      document.getElementById("finderCount").hidden = true;
      success.hidden = false;
      bar.style.width = "100%";
      success.focus();
    });

    restart.addEventListener("click", () => {
      form.reset();
      syncBudget();
      vehicle.reset();
      success.hidden = true;
      form.hidden = false;
      document.getElementById("finderCount").hidden = false;
      show(0);
    });

    function collect() {
      const fd = new FormData(form);
      const types = fd.getAll("type");
      return {
        "Type de véhicule": types.length ? types.join(", ") : "Peu importe",
        "Marque": fd.get("marque") || "Peu importe",
        "Modèle": fd.get("modele") || "Peu importe",
        "Véhicule (précisé)": fd.get("vehicule_autre") || "—",
        "Énergie": fd.get("energie"),
        "Boîte": fd.get("boite"),
        "Kilométrage max": fd.get("km_max"),
        "Année minimum": fd.get("annee_min"),
        "Budget max": formatBudget(),
        "Reprise véhicule actuel": fd.get("reprise"),
        "Délai": fd.get("delai"),
        "Nom": fd.get("nom"),
        "Email": fd.get("email"),
        "Téléphone": fd.get("telephone"),
        "Code postal": fd.get("code_postal") || "Non précisé",
        "Précisions": fd.get("precisions") || "Aucune",
      };
    }
  }

  /**
   * Brand -> model dependent selects, fed by data/vehicules.json (catalogue of
   * makes/models sold in France). "Autre" or a failed load falls back to free text.
   */
  function initVehiclePicker(form) {
    const OTHER = "Autre";
    const brandSel = form.querySelector("#ff-brand");
    const modelSel = form.querySelector("#ff-model");
    const otherField = form.querySelector("#ff-other-field");
    const otherInput = form.querySelector("#ff-other");
    let catalogue = {};

    const sortFr = (a, b) => a.localeCompare(b, "fr", { numeric: true, sensitivity: "base" });

    function fillModels() {
      const brand = brandSel.value;
      const models = catalogue[brand] || [];
      modelSel.innerHTML = "";
      if (brand === "Peu importe" || brand === OTHER) {
        modelSel.add(new Option(brand === OTHER ? "Précisez ci-dessous" : "Choisissez une marque", "Peu importe"));
        modelSel.disabled = true;
      } else {
        modelSel.add(new Option("Peu importe", "Peu importe"));
        models.slice().sort(sortFr).forEach((m) => modelSel.add(new Option(m, m)));
        modelSel.add(new Option("Autre modèle", OTHER));
        modelSel.disabled = false;
      }
      syncOther();
    }

    function syncOther() {
      const show = brandSel.value === OTHER || modelSel.value === OTHER;
      otherField.hidden = !show;
      if (!show) otherInput.value = "";
    }

    function fallbackToText() {
      brandSel.closest(".field-row").hidden = true;
      otherField.hidden = false;
      otherField.querySelector("label").textContent = "Marque / modèle souhaité (facultatif)";
    }

    brandSel.addEventListener("change", fillModels);
    modelSel.addEventListener("change", syncOther);

    fetch("data/vehicules.json")
      .then((res) => {
        if (!res.ok) throw new Error(res.status);
        return res.json();
      })
      .then((json) => {
        catalogue = json.brands || {};
        Object.keys(catalogue)
          .sort(sortFr)
          .forEach((b) => brandSel.add(new Option(b, b)));
        brandSel.add(new Option("Autre marque", OTHER));
      })
      .catch(fallbackToText);

    return {
      reset() {
        brandSel.value = "Peu importe";
        fillModels();
      },
    };
  }

  /**
   * Delivers a request to NEBAUTO. Returns "sent" (form service accepted it),
   * "mail" (pre-filled email opened in the visitor's mail app) or "error".
   */
  async function sendRequest(subject, data, replyTo) {
    if (CONFIG.formEndpoint) {
      try {
        const res = await fetch(CONFIG.formEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(
            Object.assign({ _subject: subject, _template: "table", _captcha: "false", _replyto: replyTo || "" }, data)
          ),
        });
        if (!res.ok) return "error";
        // FormSubmit answers 200 with success "false" (e.g. inbox not yet activated).
        const json = await res.json().catch(() => ({}));
        return String(json.success) === "false" ? "error" : "sent";
      } catch (err) {
        return "error";
      }
    }
    const body = Object.keys(data)
      .map((k) => k + " : " + data[k])
      .join("\n");
    window.location.href =
      "mailto:" + CONFIG.email + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
    return "mail";
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
      const status = document.getElementById("contactStatus");
      const submitBtn = form.querySelector('[type="submit"]');
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (!form.checkValidity()) {
          form.reportValidity();
          return;
        }
        const fd = new FormData(form);
        const subjectSelect = form.querySelector("#cf-subject");
        const data = {
          "Nom": fd.get("name"),
          "Email": fd.get("email"),
          "Téléphone": fd.get("phone") || "Non précisé",
          "Type de demande": subjectSelect.options[subjectSelect.selectedIndex].text,
          "Message": fd.get("message") || "—",
        };
        submitBtn.disabled = true;
        status.textContent = "Envoi en cours...";
        const result = await sendRequest("Contact site — " + data["Nom"], data, data["Email"]);
        submitBtn.disabled = false;
        status.textContent = "";
        if (result === "error") {
          status.textContent = "L'envoi a échoué. Réessayez ou écrivez-nous à " + CONFIG.email + ".";
          return;
        }
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
