/* ====================================================================
   VEDANTA DENTAL CLINIC — MAIN SCRIPT
   ==================================================================== */

(function () {
  "use strict";

  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  /* ------------------------------------------------------------------
     UTILITIES
     ------------------------------------------------------------------ */
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  /* ------------------------------------------------------------------
     PRELOADER + FRAME SEQUENCE LOADER
     ------------------------------------------------------------------ */
  const FRAME_COUNT = 80;
  const FRAME_PATH = (i) =>
    `assets/frames/frame-${String(i).padStart(3, "0")}.jpg`;
  const frameImages = [];
  let framesLoaded = 0;

  const preloader = document.getElementById("preloader");
  const preloaderFill = document.getElementById("preloaderFill");

  function loadFrames(onDone) {
    for (let i = 1; i <= FRAME_COUNT; i++) {
      const img = new Image();
      img.src = FRAME_PATH(i);
      img.onload = img.onerror = () => {
        framesLoaded++;
        const pct = Math.round((framesLoaded / FRAME_COUNT) * 100);
        if (preloaderFill) preloaderFill.style.width = pct + "%";
        if (framesLoaded >= FRAME_COUNT) onDone();
      };
      frameImages.push(img);
    }
  }

  function hidePreloader() {
    if (!preloader) return;
    
    // Smooth high-end exit timeline
    const tl = gsap.timeline({
      onComplete: () => {
        preloader.remove();
        // Play slide 1 intro automatically
        playHeroIntro();
      }
    });

    tl.to(preloaderFill, { width: "100%", duration: 0.3 })
      .to(".preloader__mark", { scale: 1.25, opacity: 0, duration: 0.6, ease: "power4.in" })
      .to(preloader, { opacity: 0, duration: 0.8, ease: "power3.out" }, "-=0.2");
  }

  /* ------------------------------------------------------------------
     HERO CANVAS SEQUENCE STATE
     ------------------------------------------------------------------ */
  const canvas = document.getElementById("heroCanvas");
  const ctx = canvas ? canvas.getContext("2d") : null;
  let canvasW = 0,
    canvasH = 0;

  const canvasState = {
    frameIndex: 0,
    scale: 1.0,
  };

  function resizeCanvas() {
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvasW = canvas.clientWidth;
    canvasH = canvas.clientHeight;
    canvas.width = canvasW * dpr;
    canvas.height = canvasH * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  /* ------------------------------------------------------------------
     CANVAS FLOATING PARTICLES ENGINE
     ------------------------------------------------------------------ */
  const particles = [];
  const PARTICLE_COUNT = 40;

  function initParticles() {
    particles.length = 0;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push({
        x: Math.random(),
        y: Math.random(),
        size: Math.random() * 2.0 + 0.8,
        speedY: Math.random() * 0.0003 + 0.0001,
        speedX: (Math.random() - 0.5) * 0.0002,
        opacity: Math.random() * 0.5 + 0.15,
        wobble: Math.random() * Math.PI * 2,
        wobbleSpeed: Math.random() * 0.008 + 0.004,
      });
    }
  }

  function updateAndDrawParticles(ctx, width, height, progress) {
    ctx.save();
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.y -= p.speedY + (progress * 0.00008);
      p.wobble += p.wobbleSpeed;
      p.x += p.speedX + Math.sin(p.wobble) * 0.00015;

      if (p.y < -0.05) p.y = 1.05;
      if (p.x < -0.05) p.x = 1.05;
      if (p.x > 1.05) p.x = -0.05;

      const px = p.x * width;
      const py = p.y * height;
      const radius = p.size;

      const radGrad = ctx.createRadialGradient(px, py, 0, px, py, radius * 4);
      // Fade from subtle teal-cyan to transparent
      radGrad.addColorStop(0, `rgba(20, 184, 166, ${p.opacity})`);
      radGrad.addColorStop(0.3, `rgba(6, 182, 212, ${p.opacity * 0.4})`);
      radGrad.addColorStop(1, "rgba(255, 255, 255, 0)");

      ctx.fillStyle = radGrad;
      ctx.beginPath();
      ctx.arc(px, py, radius * 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawCanvasFrame() {
    if (!ctx || !canvasW || !canvasH) return;

    // Soft breathing scaling during early frames
    let breathingScale = 1.0;
    if (canvasState.frameIndex < 18) {
      const time = Date.now() * 0.0016;
      breathingScale = 1.0 + Math.sin(time) * 0.012;
    }

    const currentScale = canvasState.scale * breathingScale;

    const i = clamp(Math.round(canvasState.frameIndex), 0, FRAME_COUNT - 1);
    const img = frameImages[i];
    if (!img || !img.complete || img.naturalWidth === 0) return;

    const imgRatio = img.naturalWidth / img.naturalHeight;
    const canvasRatio = canvasW / canvasH;
    let drawW, drawH;

    if (imgRatio > canvasRatio) {
      drawH = canvasH * currentScale;
      drawW = drawH * imgRatio;
    } else {
      drawW = canvasW * currentScale;
      drawH = drawW / imgRatio;
    }

    const offX = (canvasW - drawW) / 2;
    const offY = (canvasH - drawH) / 2;

    ctx.clearRect(0, 0, canvasW, canvasH);
    ctx.drawImage(img, offX, offY, drawW, drawH);

    const progress = canvasState.frameIndex / (FRAME_COUNT - 1);
    updateAndDrawParticles(ctx, canvasW, canvasH, progress);
  }

  function renderLoop() {
    drawCanvasFrame();
    requestAnimationFrame(renderLoop);
  }

  /* ------------------------------------------------------------------
     SMOOTH SCROLLING (LENIS)
     ------------------------------------------------------------------ */
  let lenis;
  function initLenis() {
    if (prefersReducedMotion) return;

    lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // expo out
      orientation: "vertical",
      gestureOrientation: "vertical",
      smoothWheel: true,
      wheelMultiplier: 1.0,
      touchMultiplier: 1.5,
      infinite: false,
    });

    lenis.on("scroll", ScrollTrigger.update);

    gsap.ticker.add((time) => {
      lenis.raf(time * 1000);
    });

    gsap.ticker.lagSmoothing(0);
  }

  /* ------------------------------------------------------------------
     HERO SLIDE INTRO (FIRST PAINT)
     ------------------------------------------------------------------ */
  function playHeroIntro() {
    const slide1 = document.querySelector(".hero__slide--1");
    if (!slide1) return;
    
    gsap.set(slide1, { opacity: 1, visibility: "visible" });
    gsap.to(slide1.querySelectorAll(".hero__eyebrow, .hero__headline"), {
      opacity: 1,
      y: 0,
      stagger: 0.15,
      duration: 0.8,
      ease: "power3.out",
    });
  }

  /* ------------------------------------------------------------------
     INIT GSAP TIMELINES & SCROLLTRIGGERS
     ------------------------------------------------------------------ */
  function initGSAP() {
    gsap.registerPlugin(ScrollTrigger);
    gsap.defaults({ ease: "power3.out" });

    // Mark as ready
    document.documentElement.classList.add("gsap-ready");
    window.dispatchEvent(new Event("scroll"));

    const heroSection = document.getElementById("hero");
    const heroProgressFill = document.getElementById("heroProgressFill");
    const heroGlow = document.getElementById("heroGlow");

    if (!heroSection) return;

    // Reset slide positions to ready state
    const slides = document.querySelectorAll(".hero__slide");
    gsap.set(slides, { opacity: 0, visibility: "hidden" });
    slides.forEach((slide) => {
      gsap.set(slide.querySelectorAll(".hero__eyebrow, .hero__headline, .hero__sub, .hero__cta"), {
        opacity: 0,
        y: 30,
      });
    });

    // MatchMedia configuration for responsive animations
    const mm = gsap.matchMedia();

    if (!prefersReducedMotion) {
      // 1. DESKTOP TIMELINE CONFIGURATION
      mm.add("(min-width: 981px)", () => {
        const desktopTimeline = gsap.timeline({
          scrollTrigger: {
            trigger: heroSection,
            start: "top top",
            end: "+=400%", // 400vh distance
            pin: true,
            pinSpacing: true,
            anticipatePin: 1,
            scrub: 1.0,
            invalidateOnRefresh: true,
            onUpdate: (self) => {
              if (heroProgressFill) {
                heroProgressFill.style.width = `${self.progress * 100}%`;
              }
            },
          },
        });

        // Frame scrub
        desktopTimeline.to(canvasState, {
          frameIndex: FRAME_COUNT - 1,
          ease: "none",
          duration: 4.0,
        }, 0);

        // Zoom scale tweens
        desktopTimeline.to(canvasState, { scale: 1.15, ease: "power1.inOut", duration: 1.0 }, 0.8)
                       .to(canvasState, { scale: 1.06, ease: "power1.inOut", duration: 1.0 }, 2.4)
                       .to(canvasState, { scale: 1.0, ease: "power1.inOut", duration: 0.6 }, 3.4);

        // Glow backdrop reveal
        if (heroGlow) {
          desktopTimeline.to(heroGlow, { opacity: 1, duration: 0.8, ease: "power2.out" }, 3.2);
        }

        // Helpers for slides transitions
        const showSlide = (num) => {
          const slide = document.querySelector(`.hero__slide--${num}`);
          if (!slide) return [];
          const targets = slide.querySelectorAll(".hero__eyebrow, .hero__headline, .hero__sub, .hero__cta");
          return [
            gsap.to(slide, { opacity: 1, visibility: "visible", duration: 0.2 }),
            gsap.to(targets, { opacity: 1, y: 0, stagger: 0.08, duration: 0.4, ease: "power2.out" }),
          ];
        };

        const hideSlide = (num) => {
          const slide = document.querySelector(`.hero__slide--${num}`);
          if (!slide) return [];
          const targets = slide.querySelectorAll(".hero__eyebrow, .hero__headline, .hero__sub, .hero__cta");
          return [
            gsap.to(targets, { opacity: 0, y: -20, stagger: 0.05, duration: 0.3, ease: "power2.in" }),
            gsap.to(slide, { opacity: 0, visibility: "hidden", duration: 0.2 }, "-=0.1"),
          ];
        };

        // Slide 1 - Initial State (visible at start)
        desktopTimeline.to(document.querySelector(".hero__slide--1"), { opacity: 1, visibility: "visible", duration: 0.1 }, 0);
        desktopTimeline.to(document.querySelectorAll(".hero__slide--1 .hero__eyebrow, .hero__slide--1 .hero__headline"), { opacity: 1, y: 0, stagger: 0.05, duration: 0.2 }, 0);

        // Slide 1 Exit -> Slide 2 Enter
        desktopTimeline.add(hideSlide(1), 0.7);
        desktopTimeline.add(showSlide(2), 0.9);

        // Slide 2 Exit -> Slide 3 Enter
        desktopTimeline.add(hideSlide(2), 1.5);
        desktopTimeline.add(showSlide(3), 1.7);

        // Slide 3 Exit -> Slide 4 Enter
        desktopTimeline.add(hideSlide(3), 2.3);
        desktopTimeline.add(showSlide(4), 2.5);

        // Slide 4 Exit -> Slide 5 Enter
        desktopTimeline.add(hideSlide(4), 3.1);
        desktopTimeline.add(showSlide(5), 3.3);
      });

      // 2. MOBILE TIMELINE CONFIGURATION
      mm.add("(max-width: 980px)", () => {
        const mobileTimeline = gsap.timeline({
          scrollTrigger: {
            trigger: heroSection,
            start: "top top",
            end: "+=220%", // shorter mobile pin to prevent visual fatigue
            pin: true,
            pinSpacing: true,
            anticipatePin: 1,
            scrub: 0.8,
            invalidateOnRefresh: true,
            onUpdate: (self) => {
              if (heroProgressFill) {
                heroProgressFill.style.width = `${self.progress * 100}%`;
              }
            },
          },
        });

        // Mobile frame scrub
        mobileTimeline.to(canvasState, {
          frameIndex: FRAME_COUNT - 1,
          ease: "none",
          duration: 3.0,
        }, 0);

        // Smaller mobile zoom to prevent cropping
        mobileTimeline.to(canvasState, { scale: 1.06, ease: "power1.inOut", duration: 0.8 }, 0.6)
                      .to(canvasState, { scale: 1.0, ease: "power1.inOut", duration: 0.8 }, 2.0);

        if (heroGlow) {
          mobileTimeline.to(heroGlow, { opacity: 0.8, duration: 0.6, ease: "power2.out" }, 2.4);
        }

        const showMobileSlide = (num) => {
          const slide = document.querySelector(`.hero__slide--${num}`);
          if (!slide) return [];
          const targets = slide.querySelectorAll(".hero__eyebrow, .hero__headline, .hero__sub, .hero__cta");
          return [
            gsap.to(slide, { opacity: 1, visibility: "visible", duration: 0.15 }),
            gsap.to(targets, { opacity: 1, y: 0, stagger: 0.05, duration: 0.35, ease: "power2.out" }),
          ];
        };

        const hideMobileSlide = (num) => {
          const slide = document.querySelector(`.hero__slide--${num}`);
          if (!slide) return [];
          const targets = slide.querySelectorAll(".hero__eyebrow, .hero__headline, .hero__sub, .hero__cta");
          return [
            gsap.to(targets, { opacity: 0, y: -15, stagger: 0.04, duration: 0.25, ease: "power2.in" }),
            gsap.to(slide, { opacity: 0, visibility: "hidden", duration: 0.15 }, "-=0.15"),
          ];
        };

        mobileTimeline.to(document.querySelector(".hero__slide--1"), { opacity: 1, visibility: "visible", duration: 0.1 }, 0);
        mobileTimeline.to(document.querySelectorAll(".hero__slide--1 .hero__eyebrow, .hero__slide--1 .hero__headline"), { opacity: 1, y: 0, stagger: 0.05, duration: 0.2 }, 0);

        // Stagger transitions faster on mobile
        mobileTimeline.add(hideMobileSlide(1), 0.5);
        mobileTimeline.add(showMobileSlide(2), 0.7);

        mobileTimeline.add(hideMobileSlide(2), 1.1);
        mobileTimeline.add(showMobileSlide(3), 1.3);

        mobileTimeline.add(hideMobileSlide(3), 1.7);
        mobileTimeline.add(showMobileSlide(4), 1.9);

        mobileTimeline.add(hideMobileSlide(4), 2.3);
        mobileTimeline.add(showMobileSlide(5), 2.5);
      });
    } else {
      // 3. REDUCED MOTION STATIC INITS
      canvasState.frameIndex = FRAME_COUNT - 1;
      canvasState.scale = 1.0;
      const lastSlide = document.querySelector(".hero__slide--5");
      if (lastSlide) {
        gsap.set(lastSlide, { opacity: 1, visibility: "visible" });
        gsap.set(lastSlide.querySelectorAll(".hero__eyebrow, .hero__headline, .hero__sub, .hero__cta"), { opacity: 1, y: 0 });
      }
      if (heroGlow) gsap.set(heroGlow, { opacity: 1 });
    }

    /* ---- GENERIC SCROLL REVEALS ---- */
    document.body.classList.add("reveal-ready");
    const revealEls = document.querySelectorAll("[data-reveal]");
    revealEls.forEach((el) => {
      gsap.fromTo(el, 
        { opacity: 0, y: 36 },
        {
          opacity: 1,
          y: 0,
          duration: 1.0,
          ease: "power3.out",
          scrollTrigger: {
            trigger: el,
            start: "top 88%",
            toggleActions: "play none none none"
          }
        }
      );
    });

    /* ---- ANIMATED COUNTERS ---- */
    document.querySelectorAll(".stat__num[data-count]").forEach((el) => {
      const target = parseFloat(el.dataset.count);
      const suffix = el.dataset.suffix || "";
      const isDecimal = !Number.isInteger(target);
      
      gsap.fromTo(el,
        { innerText: 0 },
        {
          innerText: target,
          duration: 1.8,
          ease: "power2.out",
          snap: isDecimal ? {} : { innerText: 1 },
          scrollTrigger: {
            trigger: el,
            start: "top 90%",
            once: true
          },
          onUpdate: function () {
            const v = parseFloat(el.innerText);
            el.innerText = (isDecimal ? v.toFixed(1) : Math.round(v)) + suffix;
          }
        }
      );
    });

    /* ---- WHY-CHOOSE-US MAGNETIC TILT ---- */
    document.querySelectorAll("[data-tilt]").forEach((card) => {
      card.addEventListener("mousemove", (e) => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        gsap.to(card, {
          rotateX: y * -6,
          rotateY: x * 6,
          transformPerspective: 800,
          duration: 0.4,
          ease: "power2.out",
        });
      });
      card.addEventListener("mouseleave", () => {
        gsap.to(card, {
          rotateX: 0,
          rotateY: 0,
          duration: 0.6,
          ease: "power3.out",
        });
      });
    });

    /* ---- PROCESS HORIZONTAL SCROLL ---- */
    const processTrack = document.getElementById("processTrack");
    const processRail = document.getElementById("processRail");
    
    mm.add("(min-width: 701px)", () => {
      if (processTrack && processRail) {
        const setDistance = () =>
          Math.max(0, processTrack.scrollWidth - window.innerWidth + 120);

        gsap.to(processTrack, {
          x: () => -setDistance(),
          ease: "none",
          scrollTrigger: {
            trigger: processRail,
            start: "top 100px",
            end: () => "+=" + setDistance(),
            pin: true,
            scrub: 0.5,
            invalidateOnRefresh: true,
          }
        });
      }
    });

    /* ---- TECH TIMELINE GLOW & DOT ANIMATION ---- */
    document.querySelectorAll(".tech__item").forEach((item, i) => {
      gsap.fromTo(
        item.querySelector(".tech__icon"),
        { scale: 0.7, opacity: 0 },
        {
          scale: 1,
          opacity: 1,
          duration: 0.8,
          ease: "back.out(1.5)",
          scrollTrigger: {
            trigger: item,
            start: "top 86%",
            once: true
          }
        }
      );
      
      gsap.fromTo(
        item.querySelector(".tech__dot"),
        { scale: 0 },
        {
          scale: 1,
          duration: 0.5,
          ease: "elastic.out(1, 0.5)",
          delay: 0.2,
          scrollTrigger: {
            trigger: item,
            start: "top 86%",
            once: true
          }
        }
      );
    });

    ScrollTrigger.refresh();
  }

  /* ------------------------------------------------------------------
     NAVIGATION STATE & MENUS
     ------------------------------------------------------------------ */
  function initNav() {
    const nav = document.getElementById("siteNav");
    const burger = document.getElementById("navBurger");
    const mobileMenu = document.getElementById("mobileMenu");
    const mobileMenuOverlay = document.getElementById("mobileMenuOverlay");
    const heroEl = document.getElementById("hero");

    function updateNavState() {
      if (!document.documentElement.classList.contains("gsap-ready")) return;
      const heroBottom = heroEl ? heroEl.getBoundingClientRect().bottom : 0;
      nav.classList.toggle("nav--on-hero", heroBottom > 90);
    }
    window.addEventListener("scroll", updateNavState, { passive: true });
    updateNavState();

    function toggleMenu(open) {
      const isOpen =
        open !== undefined ? open : !mobileMenu.classList.contains("is-open");
      
      mobileMenu.classList.toggle("is-open", isOpen);
      burger.classList.toggle("is-active", isOpen);
      burger.setAttribute("aria-expanded", String(isOpen));
      mobileMenu.setAttribute("aria-hidden", String(!isOpen));
      
      if (mobileMenuOverlay) {
        mobileMenuOverlay.classList.toggle("is-active", isOpen);
        mobileMenuOverlay.setAttribute("aria-hidden", String(!isOpen));
      }

      document.body.style.overflow = isOpen ? "hidden" : "";
      
      // Sync with Lenis scrolling
      if (lenis) {
        if (isOpen) lenis.stop();
        else lenis.start();
      }
    }

    burger.addEventListener("click", () => toggleMenu());
    if (mobileMenuOverlay) {
      mobileMenuOverlay.addEventListener("click", () => toggleMenu(false));
    }
    mobileMenu
      .querySelectorAll("a")
      .forEach((a) => a.addEventListener("click", () => toggleMenu(false)));
  }

  /* ------------------------------------------------------------------
     SMOOTH ANCHOR SCROLLING (INTEGRATED WITH LENIS)
     ------------------------------------------------------------------ */
  function initSmoothAnchors() {
    document.querySelectorAll('a[href^="#"]').forEach((link) => {
      link.addEventListener("click", (e) => {
        const id = link.getAttribute("href");
        if (id.length < 2) return;
        const target = document.querySelector(id);
        if (!target) return;
        e.preventDefault();

        // Close mobile drawer if active
        const mobileMenu = document.getElementById("mobileMenu");
        if (mobileMenu && mobileMenu.classList.contains("is-open")) {
          const burger = document.getElementById("navBurger");
          if (burger) burger.click();
        }

        const navHeight = document.getElementById("siteNav").offsetHeight;
        
        if (lenis) {
          lenis.scrollTo(target, {
            offset: -navHeight - 12,
            duration: 1.4,
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // expo out
          });
        } else {
          const top = target.getBoundingClientRect().top + window.scrollY - navHeight - 12;
          window.scrollTo({
            top,
            behavior: prefersReducedMotion ? "auto" : "smooth",
          });
        }
      });
    });
  }

  /* ------------------------------------------------------------------
     FAQ ACCORDION (GSAP SMOOTH HEIGHT)
     ------------------------------------------------------------------ */
  function initFAQ() {
    document.querySelectorAll(".faq__item").forEach((item) => {
      const btn = item.querySelector(".faq__q");
      const ans = item.querySelector(".faq__a");
      btn.addEventListener("click", () => {
        const isOpen = item.classList.contains("is-open");

        // Close other opened panels first
        document.querySelectorAll(".faq__item.is-open").forEach((openItem) => {
          if (openItem !== item) {
            openItem.classList.remove("is-open");
            openItem.querySelector(".faq__q").setAttribute("aria-expanded", "false");
            gsap.to(openItem.querySelector(".faq__a"), { height: 0, duration: 0.4, ease: "power2.out" });
          }
        });

        item.classList.toggle("is-open", !isOpen);
        btn.setAttribute("aria-expanded", String(!isOpen));

        // Animate height
        gsap.to(ans, {
          height: !isOpen ? "auto" : 0,
          duration: 0.45,
          ease: "power3.out",
          onComplete: () => {
            // Recalculate ScrollTrigger markers
            ScrollTrigger.refresh();
          }
        });
      });
    });
  }

  /* ------------------------------------------------------------------
     GALLERY MASONRY & LIGHTBOX (GSAP BATCHED)
     ------------------------------------------------------------------ */
  function initGallery() {
    const masonry = document.getElementById("galleryMasonry");
    if (!masonry) return;
    const images = [
      "assets/Inner Photo/1.jpeg",
      "assets/Inner Photo/2.jpeg",
      "assets/Inner Photo/3.jpeg",
      "assets/Inner Photo/4.jpeg",
      "assets/Inner Photo/5.jpeg",
      "assets/Inner Photo/6.jpeg",
      "assets/Inner Photo/7.jpeg",
      "assets/Inner Photo/8.jpeg",
      "assets/Inner Photo/9.jpeg"
    ];
    const heights = [220, 300, 260, 320, 240, 300, 220, 280, 260];

    images.forEach((src, i) => {
      const item = document.createElement("div");
      item.className = "gallery__item";
      item.style.gridRowEnd = `span ${Math.round(heights[i] / 10)}`;
      
      // Set initial state for reveal stagger
      gsap.set(item, { opacity: 0, y: 30 });

      const img = document.createElement("img");
      img.src = src;
      img.alt = `Precision dental repair illustration — stage ${i + 1}`;
      img.loading = "lazy";
      item.appendChild(img);
      item.addEventListener("click", () => openLightbox(img.src, img.alt));
      masonry.appendChild(item);
    });

    // Batch element triggers
    ScrollTrigger.batch(".gallery__item", {
      onEnter: (elements) => {
        gsap.to(elements, {
          opacity: 1,
          y: 0,
          stagger: 0.08,
          duration: 0.8,
          ease: "power2.out",
          overwrite: "auto"
        });
      },
      once: true
    });
  }

  function openLightbox(src, alt) {
    const lightbox = document.getElementById("lightbox");
    const img = document.getElementById("lightboxImg");
    img.src = src;
    img.alt = alt;

    if (lenis) lenis.stop();
    lightbox.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";

    gsap.timeline()
      .set(lightbox, { display: "flex", opacity: 0 })
      .to(lightbox, { opacity: 1, duration: 0.4 })
      .fromTo(img, { scale: 0.85 }, { scale: 1, duration: 0.4, ease: "back.out(1.2)" }, "-=0.3");
  }

  function closeLightbox() {
    const lightbox = document.getElementById("lightbox");
    const img = document.getElementById("lightboxImg");

    gsap.timeline({
      onComplete: () => {
        lightbox.setAttribute("aria-hidden", "true");
        document.body.style.overflow = "";
        lightbox.style.display = "none";
        if (lenis) lenis.start();
      }
    })
    .to(img, { scale: 0.85, duration: 0.3, ease: "power2.in" })
    .to(lightbox, { opacity: 0, duration: 0.3 }, "-=0.2");
  }

  function initLightbox() {
    const closeBtn = document.getElementById("lightboxClose");
    if (closeBtn) closeBtn.addEventListener("click", closeLightbox);
    
    const lightbox = document.getElementById("lightbox");
    if (lightbox) {
      lightbox.addEventListener("click", (e) => {
        if (e.target.id === "lightbox") closeLightbox();
      });
    }

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeLightbox();
    });
  }

  /* ------------------------------------------------------------------
     BENTO CARDS HOVER GLOWS
     ------------------------------------------------------------------ */
  function initBentoGlow() {
    document.querySelectorAll(".bento__card").forEach((card) => {
      const glow = card.querySelector(".bento__glow");
      if (!glow) return;

      card.addEventListener("mousemove", (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        gsap.to(glow, {
          left: x - glow.offsetWidth / 2,
          top: y - glow.offsetHeight / 2,
          opacity: 1,
          duration: 0.5,
          ease: "power2.out"
        });
      });

      card.addEventListener("mouseleave", () => {
        gsap.to(glow, {
          opacity: 0,
          duration: 0.7,
          ease: "power2.out"
        });
      });
    });
  }

  /* ------------------------------------------------------------------
     2.5D DOCTOR PORTRAIT PARALLAX
     ------------------------------------------------------------------ */
  function initDoctorParallax() {
    const portrait = document.querySelector(".doctor__portrait");
    if (!portrait) return;
    const head = portrait.querySelector(".doctor__art-head");
    const body = portrait.querySelector(".doctor__art-body");
    const mask = portrait.querySelector(".doctor__art-mask");

    portrait.addEventListener("mousemove", (e) => {
      const rect = portrait.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5; // -0.5 to 0.5
      const y = (e.clientY - rect.top) / rect.height - 0.5; // -0.5 to 0.5

      gsap.to(head, { x: x * 16, y: y * 16, duration: 0.5, ease: "power2.out" });
      gsap.to(mask, { x: x * -10, y: y * -10, duration: 0.5, ease: "power2.out" });
      gsap.to(body, { x: x * 6, y: y * 6, duration: 0.5, ease: "power2.out" });
    });

    portrait.addEventListener("mouseleave", () => {
      gsap.to([head, mask, body], { x: 0, y: 0, duration: 0.8, ease: "power3.out" });
    });
  }

  /* ------------------------------------------------------------------
     APPOINTMENT FORM -> WHATSAPP HANDOFF
     ------------------------------------------------------------------ */
  function initForm() {
    const form = document.getElementById("appointmentForm");
    if (!form) return;
    
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      
      const name = form.querySelector("#fname").value.trim();
      const phone = form.querySelector("#fphone").value.trim();
      const service = form.querySelector("#fservice").value;
      const message = form.querySelector("#fmsg").value.trim();

      // Basic local validation
      if (!name || !phone) {
        alert("Please enter both your name and phone number.");
        return;
      }

      // Simple phone verification (at least 10 digits)
      const cleanPhone = phone.replace(/[^0-9+]/g, '');
      if (cleanPhone.length < 10) {
        alert("Please enter a valid phone number.");
        return;
      }

      let text = `Hi Vedanta Dental, I'd like to book an appointment.\n\n`;
      text += `*Name:* ${name}\n`;
      text += `*Phone:* ${phone}\n`;
      if (service) text += `*Treatment:* ${service}\n`;
      if (message) text += `*Message:* ${message}\n`;

      const url = `https://wa.me/918279976868?text=${encodeURIComponent(text)}`;
      window.open(url, "_blank", "noopener");
    });
  }

  /* ------------------------------------------------------------------
     BUTTON MAGNETIC GLOW (spotlight coordinate hooks)
     ------------------------------------------------------------------ */
  function initButtonGlow() {
    document.querySelectorAll(".btn").forEach((btn) => {
      btn.addEventListener("mousemove", (e) => {
        const r = btn.getBoundingClientRect();
        btn.style.setProperty(
          "--mx",
          `${((e.clientX - r.left) / r.width) * 100}%`,
        );
        btn.style.setProperty(
          "--my",
          `${((e.clientY - r.top) / r.height) * 100}%`,
        );
      });
    });
  }

  /* ------------------------------------------------------------------
     FOOTER DATE SETTER
     ------------------------------------------------------------------ */
  function setYear() {
    const el = document.getElementById("year");
    if (el) el.textContent = new Date().getFullYear();
  }

  /* ------------------------------------------------------------------
     SYSTEM BOOT
     ------------------------------------------------------------------ */
  function boot() {
    resizeCanvas();
    window.addEventListener("resize", () => {
      clearTimeout(window.__resizeTimer);
      window.__resizeTimer = setTimeout(() => {
        resizeCanvas();
        if (typeof ScrollTrigger !== "undefined") ScrollTrigger.refresh();
      }, 150);
    });

    initParticles();
    renderLoop();

    initLenis();
    initNav();
    initSmoothAnchors();
    initFAQ();
    initGallery();
    initLightbox();
    initForm();
    initButtonGlow();
    initBentoGlow();
    initDoctorParallax();
    setYear();

    if (typeof gsap !== "undefined" && typeof ScrollTrigger !== "undefined") {
      initGSAP();
    }

    hidePreloader();
  }

  document.addEventListener("DOMContentLoaded", () => {
    resizeCanvas();
    loadFrames(boot);
    
    // Safety check: hide loader if canvas frame loading takes too long (e.g. offline/poor connection)
    setTimeout(() => {
      if (framesLoaded < FRAME_COUNT) boot();
    }, 6000);
  });
})();
