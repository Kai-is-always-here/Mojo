const IMAGES = Array.from({ length: 13 }, (_, index) => `${index + 1}.png`);
const root = document.querySelector('[data-auth-slideshow]');

if (root) {
  const base = root.dataset.posterBase || 'shared/auth/';
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const slides = IMAGES.map((name, index) => {
    const slide = document.createElement('div');
    slide.className = `auth-slide${index === 0 ? ' is-active' : ''}`;
    slide.setAttribute('aria-hidden', 'true');
    if (index === 0) slide.style.backgroundImage = `url("${base}${name}")`;
    root.appendChild(slide);
    return slide;
  });

  const warm = (index) => {
    if (index >= IMAGES.length) return;
    const image = new Image();
    image.decoding = 'async';
    image.src = `${base}${IMAGES[index]}`;
  };

  // Do not download all large background images before first paint.
  // Warm them progressively after the page is visible so navigation feels instant.
  const scheduleWarmup = () => {
    let next = 1;
    const step = () => {
      warm(next++);
      if (next < IMAGES.length) {
        if ('requestIdleCallback' in window) window.requestIdleCallback(step, { timeout: 1200 });
        else window.setTimeout(step, 180);
      }
    };
    if ('requestIdleCallback' in window) window.requestIdleCallback(step, { timeout: 500 });
    else window.setTimeout(step, 120);
  };

  const reveal = (index) => {
    if (!slides[index].style.backgroundImage) {
      slides[index].style.backgroundImage = `url("${base}${IMAGES[index]}")`;
    }
  };

  if (!reduceMotion && slides.length > 1) {
    let active = 0;
    window.setInterval(() => {
      const next = (active + 1) % slides.length;
      reveal(next);
      slides[active].classList.remove('is-active');
      slides[next].classList.add('is-active');
      active = next;
    }, 4500);
  }

  if (document.readyState === 'loading') {
    window.addEventListener('load', scheduleWarmup, { once: true });
  } else {
    scheduleWarmup();
  }
}
