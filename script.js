const entrance = document.querySelector("#entrance");
const entryButton = document.querySelector("#portal-entry");
const siteShell = document.querySelector("#site-shell");
const canvas = document.querySelector("#portal-canvas");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function enterSite() {
  entrance.classList.add("is-opening");
  document.body.classList.remove("entrance-active");
  siteShell.setAttribute("aria-hidden", "false");
  window.setTimeout(() => {
    entrance.hidden = true;
    document.querySelector(".site-header .brand")?.focus({ preventScroll: true });
  }, reduceMotion ? 0 : 1000);
}

entryButton.addEventListener("click", enterSite);

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
