/* ═══════════════════════════════════════════════
   CARAVAN 108 — interaction engine
   loader / cursor / reveals / scroll-linked pins
   ═══════════════════════════════════════════════ */
(function () {
  "use strict";

  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  if (location.hash) {
    history.replaceState(null, "", location.pathname + location.search);
  }
  scrollTo(0, 0);
  addEventListener("pageshow", () => requestAnimationFrame(() => scrollTo(0, 0)), { once: true });

  const $  = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => Array.from((c || document).querySelectorAll(s));
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp01 = v => Math.max(0, Math.min(1, v));
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ── LOADER: count 000 → 108 while assets settle ── */
  const loader = $("#loader");
  const loaderCount = $("#loaderCount");
  const ringFill = $(".ring-fill");
  const RING_LEN = 326.7;
  let loadDone = false;

  (function runLoader() {
    const t0 = performance.now();
    const DURATION = reduceMotion ? 50 : 1900;
    function tick(now) {
      const p = clamp01((now - t0) / DURATION);
      const eased = 1 - Math.pow(1 - p, 3);
      const n = Math.round(eased * 108);
      loaderCount.textContent = String(n).padStart(3, "0");
      ringFill.style.strokeDashoffset = RING_LEN * (1 - eased);
      if (p < 1) { requestAnimationFrame(tick); }
      else {
        loadDone = true;
        loader.classList.add("done");
        document.body.classList.add("loaded");
        $("#hero").classList.add("in");
        // stagger hero letters
        $$(".ht-row i").forEach((el, i) => { el.style.transitionDelay = (0.08 * i) + "s"; });
        $$("#hero .reveal-line").forEach((el, i) => {
          setTimeout(() => el.classList.add("in"), 500 + i * 180);
        });
      }
    }
    requestAnimationFrame(tick);
  })();

  /* ── LANGUAGE SYSTEM: English-first, persisted toggle ── */
  const langToggle = $("#langToggle");
  function setLang(lang) {
    document.documentElement.dataset.lang = lang;
    document.documentElement.lang = lang === "en" ? "en" : "zh-CN";
    document.title = lang === "en"
      ? "Caravan 108 · Dunhuang Inspired Dry Fruit Brand"
      : "Caravan 108 · 敦煌灵感干果品牌";
    try { localStorage.setItem("c108-lang", lang); } catch (e) {}
  }
  setLang((() => {
    try { return localStorage.getItem("c108-lang") || "en"; } catch (e) { return "en"; }
  })());
  langToggle.addEventListener("click", () => {
    setLang(document.documentElement.dataset.lang === "en" ? "zh" : "en");
  });

  /* ── MOBILE MENU ── */
  const burger = $("#navBurger");
  const mobileMenu = $("#mobileMenu");
  function setMenu(open) {
    document.body.classList.toggle("menu-open", open);
    burger.setAttribute("aria-expanded", String(open));
    mobileMenu.setAttribute("aria-hidden", String(!open));
  }
  burger.addEventListener("click", () => setMenu(!document.body.classList.contains("menu-open")));
  $$(".mm-link", mobileMenu).forEach(a => a.addEventListener("click", () => setMenu(false)));
  mobileMenu.addEventListener("click", e => { if (e.target === mobileMenu) setMenu(false); });
  addEventListener("keydown", e => { if (e.key === "Escape") setMenu(false); });

  /* ── CUSTOM CURSOR (fine pointers only) ── */
  if (matchMedia("(pointer:fine)").matches) {
    const dot = $("#cursorDot"), ring = $("#cursorRing");
    let mx = -100, my = -100, rx = -100, ry = -100;
    addEventListener("mousemove", e => { mx = e.clientX; my = e.clientY; }, { passive: true });
    (function cursorLoop() {
      rx = lerp(rx, mx, 0.16); ry = lerp(ry, my, 0.16);
      dot.style.transform  = `translate(${mx}px,${my}px) translate(-50%,-50%)`;
      ring.style.transform = `translate(${rx}px,${ry}px) translate(-50%,-50%)`;
      requestAnimationFrame(cursorLoop);
    })();
    $$("a, button, [data-hover], .swatch, .fruit-card, .motif-card, .pack-panel").forEach(el => {
      el.addEventListener("mouseenter", () => ring.classList.add("hovering"));
      el.addEventListener("mouseleave", () => ring.classList.remove("hovering"));
    });
  }

  /* ── SCROLL REVEALS ── */
  const io = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
    });
  }, { threshold: 0.18, rootMargin: "0px 0px -6% 0px" });
  $$(".reveal-clip, .reveal-fade, .reveal-up, .reveal-scale, .reveal-mask, section .reveal-line")
    .forEach(el => io.observe(el));

  // gentle stagger inside grids
  $$(".fruit-cards, .pattern-swatches, .pattern-motifs, .origin-stats").forEach(grid => {
    Array.from(grid.children).forEach((el, i) => { el.style.transitionDelay = (i * 0.1) + "s"; });
  });

  /* ── STAT COUNTERS ── */
  const statIO = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      statIO.unobserve(en.target);
      const el = en.target, target = +el.dataset.count, t0 = performance.now();
      const DUR = 1600;
      (function step(now) {
        const p = clamp01((now - t0) / DUR);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(eased * target).toLocaleString("en-US");
        if (p < 1) requestAnimationFrame(step);
      })(t0);
    });
  }, { threshold: 0.6 });
  $$(".stat-num").forEach(el => statIO.observe(el));

  /* ── SCROLL ENGINE: progress bar, nav, mandala, parallax, pins ── */
  const progressBar = $("#progressBar");
  const nav = $("#nav");
  const mandala = $("#heroMandala");
  const parallaxImgs = $$("[data-parallax]");
  const panoPin = $("#panoPin"), panoTrack = $("#panoTrack"), panoBar = $("#panoBar");
  const packPin = $("#packPin"), packRail = $("#packRail"), packBar = $("#packBar"), packStep = $("#packStep");
  const ROMAN = ["Ⅰ", "Ⅱ", "Ⅲ"];
  let smoothY = 0;

  function pinProgress(pinEl) {
    // progress 0→1 across the pin's scrollable span (memory: use rects, not scroll offsets)
    const r = pinEl.getBoundingClientRect();
    const span = r.height - innerHeight;
    return span > 0 ? clamp01(-r.top / span) : 0;
  }

  function frame() {
    const doc = document.documentElement;
    const max = doc.scrollHeight - innerHeight;
    const y = scrollY || doc.scrollTop;
    smoothY = lerp(smoothY, y, 0.12);

    progressBar.style.width = (max > 0 ? (y / max) * 100 : 0) + "%";
    nav.classList.toggle("solid", y > 60);

    if (!reduceMotion) {
      // hero mandala: perpetual spin + scroll drift
      if (mandala && y < innerHeight * 1.4) {
        const t = performance.now() / 1000;
        mandala.style.transform =
          `rotate(${t * 2.2 + smoothY * 0.035}deg) scale(${1 + smoothY * 0.00012})`;
      }
      // mural parallax
      parallaxImgs.forEach(img => {
        const r = img.getBoundingClientRect();
        if (r.bottom < 0 || r.top > innerHeight) return;
        const rel = (r.top + r.height / 2 - innerHeight / 2) / innerHeight;
        img.style.transform = `translateY(${rel * -100 * (+img.dataset.parallax)}px) scale(1.13)`;
      });
      // mobile stacks these sections natively; skip the scroll-linked math
      const pinnedDesktop = innerWidth > 760;
      // silk-road panorama: horizontal scroll-linked travel
      if (panoTrack && pinnedDesktop) {
        const p = pinProgress(panoPin);
        const panoImage = panoTrack.querySelector("img");
        const sceneWidth = panoImage ? panoImage.getBoundingClientRect().width : panoTrack.scrollWidth;
        const start = innerWidth * 0.08;
        const travel = Math.max(sceneWidth - innerWidth * 0.84, innerWidth * 0.52);
        panoTrack.style.transform = `translateX(${start - p * travel}px)`;
        panoBar.style.width = (p * 100) + "%";
      }
      // packaging rail
      if (packRail && pinnedDesktop) {
        const p = pinProgress(packPin);
        const travel = packRail.scrollWidth - innerWidth * 0.84;
        packRail.style.transform = `translateX(${-p * Math.max(travel, 0)}px)`;
        packBar.style.width = (p * 100) + "%";
        packStep.textContent = ROMAN[Math.min(2, Math.floor(p * 3))] + " / Ⅲ";
      }
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  /* ── TILT on cards & panels ── */
  if (!reduceMotion && matchMedia("(pointer:fine)").matches) {
    $$("[data-tilt]").forEach(el => {
      let raf = null;
      el.addEventListener("mousemove", e => {
        if (raf) return;
        raf = requestAnimationFrame(() => {
          raf = null;
          const r = el.getBoundingClientRect();
          const px = (e.clientX - r.left) / r.width - 0.5;
          const py = (e.clientY - r.top) / r.height - 0.5;
          el.style.transform =
            `perspective(800px) rotateY(${px * 6}deg) rotateX(${py * -6}deg) translateY(-4px)`;
        });
      });
      el.addEventListener("mouseleave", () => {
        el.style.transform = "";
        el.style.transition = "transform .6s cubic-bezier(.22,.9,.28,1)";
        setTimeout(() => { el.style.transition = ""; }, 600);
      });
    });
  }
})();
