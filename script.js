const entrance = document.querySelector("#entrance");
const entryButton = document.querySelector("#portal-entry");
const skipIntroButton = document.querySelector("#skip-intro");
const replayIntroButton = document.querySelector("#replay-intro");
const siteShell = document.querySelector("#site-shell");
const canvas = document.querySelector("#portal-canvas");
const siteHeader = document.querySelector(".site-header");
const hero = document.querySelector(".hero-cta");
const progressFill = document.querySelector("#page-progress-fill");
const progressLabel = document.querySelector(".page-progress-label");
const studioConsole = document.querySelector(".studio-console");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const visitKey = "gamebuilderlabs-portal-entered";

function rememberVisit() {
  try { window.localStorage.setItem(visitKey, "true"); } catch (error) { /* Storage is optional. */ }
}

function hasVisited() {
  try { return window.localStorage.getItem(visitKey) === "true"; } catch (error) { return false; }
}

function revealSiteImmediately() {
  entrance.hidden = true;
  document.body.classList.remove("entrance-active");
  siteShell.setAttribute("aria-hidden", "false");
  siteShell.classList.add("is-live");
}

function enterSite({ animate = true } = {}) {
  rememberVisit();
  if (!animate || reduceMotion) {
    revealSiteImmediately();
    document.querySelector(".site-header .brand")?.focus({ preventScroll: true });
    return;
  }
  entryButton.disabled = true;
  entrance.classList.add("is-warping");
  window.setTimeout(() => {
    entrance.classList.add("is-opening");
    document.body.classList.remove("entrance-active");
    siteShell.setAttribute("aria-hidden", "false");
    siteShell.classList.add("is-live");
  }, 900);
  window.setTimeout(() => {
    entrance.hidden = true;
    document.querySelector(".site-header .brand")?.focus({ preventScroll: true });
  }, 1450);
}

function replayIntro() {
  window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  entrance.hidden = false;
  entrance.classList.remove("is-warping", "is-opening");
  entryButton.disabled = false;
  document.body.classList.add("entrance-active");
  siteShell.setAttribute("aria-hidden", "true");
  siteShell.classList.remove("is-live");
  window.setTimeout(() => entryButton.focus(), reduceMotion ? 0 : 350);
}

entryButton.addEventListener("click", () => enterSite());
skipIntroButton.addEventListener("click", () => enterSite({ animate: false }));
replayIntroButton.addEventListener("click", replayIntro);

if (hasVisited()) revealSiteImmediately();

const revealTargets = document.querySelectorAll(".section-label, .intro-grid > *, .path-card, .studio-copy > *, .studio-console, .families-grid > *, .family-points article, .closing > *:not(.closing-orbit)");
if (!reduceMotion && "IntersectionObserver" in window) {
  revealTargets.forEach((target) => target.classList.add("reveal-target"));
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.13 });
  revealTargets.forEach((target) => revealObserver.observe(target));
}

function updatePageMotion() {
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
  const progress = maxScroll > 0 ? Math.min(1, window.scrollY / maxScroll) : 0;
  progressFill.style.transform = `scaleY(${progress})`;
  const stage = Math.min(4, Math.floor(progress * 4) + 1);
  progressLabel.textContent = `${String(stage).padStart(2, "0")} / 04`;
  siteHeader.classList.toggle("is-scrolled", window.scrollY > 70);
}

window.addEventListener("scroll", updatePageMotion, { passive: true });
updatePageMotion();

if (!reduceMotion) {
  hero.addEventListener("pointermove", (event) => {
    const bounds = hero.getBoundingClientRect();
    hero.style.setProperty("--spot-x", `${event.clientX - bounds.left}px`);
    hero.style.setProperty("--spot-y", `${event.clientY - bounds.top}px`);
  });
  studioConsole.addEventListener("pointermove", (event) => {
    const bounds = studioConsole.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;
    studioConsole.style.setProperty("--tilt-x", `${-y * 7}deg`);
    studioConsole.style.setProperty("--tilt-y", `${x * 7}deg`);
  });
  studioConsole.addEventListener("pointerleave", () => {
    studioConsole.style.setProperty("--tilt-x", "0deg");
    studioConsole.style.setProperty("--tilt-y", "0deg");
  });
}

async function createPortalEffect() {
  try {
    const THREE = await import("https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js");
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    camera.position.z = 2;

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));

    const portal = new THREE.Group();
    scene.add(portal);

    const glowMaterial = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 } },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        uniform float uTime;
        void main() {
          vec2 p = vUv - 0.5;
          float d = length(p);
          float breathe = 0.018 * sin(uTime * 1.25);
          float ring = 1.0 - smoothstep(0.025, 0.095, abs(d - (0.39 + breathe)));
          float haze = (1.0 - smoothstep(0.25, 0.52, d)) * 0.12;
          vec3 color = mix(vec3(0.30, 0.58, 1.0), vec3(0.73, 0.46, 1.0), vUv.y);
          gl_FragColor = vec4(color, ring * 0.27 + haze);
        }
      `
    });

    portal.add(new THREE.Mesh(new THREE.PlaneGeometry(1.05, 1.05), glowMaterial));

    const particleCount = reduceMotion ? 12 : 42;
    const particlePositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 0.39 + (Math.random() - 0.5) * 0.13;
      particlePositions[i * 3] = Math.cos(angle) * radius;
      particlePositions[i * 3 + 1] = Math.sin(angle) * radius;
      particlePositions[i * 3 + 2] = 0.02;
    }
    const particlesGeometry = new THREE.BufferGeometry();
    particlesGeometry.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));
    const particles = new THREE.Points(particlesGeometry, new THREE.PointsMaterial({
      color: 0xc9d7ff,
      size: 0.012,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    }));
    portal.add(particles);

    const pointerTarget = { x: 0, y: 0 };
    entryButton.addEventListener("pointermove", (event) => {
      const bounds = entryButton.getBoundingClientRect();
      pointerTarget.x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 0.16;
      pointerTarget.y = ((event.clientY - bounds.top) / bounds.height - 0.5) * 0.16;
    });
    entryButton.addEventListener("pointerleave", () => { pointerTarget.x = 0; pointerTarget.y = 0; });

    function resize() {
      renderer.setSize(window.innerWidth, window.innerHeight, false);
      const mobile = window.innerWidth <= 800;
      portal.position.set(mobile ? 0.44 : 0.528, mobile ? 0.02 : -0.03, 0);
      const aspect = window.innerWidth / window.innerHeight;
      const scale = mobile ? Math.min(0.72, aspect * 0.82) : Math.min(0.68, aspect * 0.42);
      portal.scale.set(scale, scale * aspect, 1);
    }

    const clock = new THREE.Clock();
    function animate() {
      const time = clock.getElapsedTime();
      glowMaterial.uniforms.uTime.value = time;
      if (!reduceMotion) particles.rotation.z = time * 0.035;
      portal.rotation.y += (pointerTarget.x - portal.rotation.y) * 0.045;
      portal.rotation.x += (-pointerTarget.y - portal.rotation.x) * 0.045;
      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    }

    window.addEventListener("resize", resize, { passive: true });
    resize();
    animate();
  } catch (error) {
    canvas.hidden = true;
    console.warn("The enhanced portal effect could not load; the entrance remains available.", error);
  }
}

createPortalEffect();
