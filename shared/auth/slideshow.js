const IMAGES = Array.from({ length: 12 }, (_, index) => `${index + 1}.png`);
const root = document.querySelector('[data-auth-slideshow]');

if (root) {
  const base = root.dataset.posterBase || 'shared/auth/';
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const firstUrl = `${base}${IMAGES[0]}`;

  // Keep the first frame visible immediately; never wait for the full page load.
  root.style.backgroundImage = `url("${firstUrl}")`;
  root.style.backgroundPosition = 'center center';
  root.style.backgroundSize = 'cover';

  const slides = IMAGES.map((name, index) => {
    const slide = document.createElement('div');
    slide.className = `auth-slide${index === 0 ? ' is-active' : ''}`;
    slide.setAttribute('aria-hidden', 'true');
    if (index === 0) slide.style.backgroundImage = `url("${firstUrl}")`;
    root.appendChild(slide);
    return slide;
  });

  const warm = (index, priority = 'low') => {
    if (index < 0 || index >= IMAGES.length) return;
    const image = new Image();
    image.decoding = 'async';
    if ('fetchPriority' in image) image.fetchPriority = priority;
    image.src = `${base}${IMAGES[index]}`;
    return image;
  };

  const reveal = (index) => {
    const nextUrl = `${base}${IMAGES[index]}`;
    if (!slides[index].style.backgroundImage) slides[index].style.backgroundImage = `url("${nextUrl}")`;
    warm((index + 1) % IMAGES.length, 'high');
  };

  // The browser preload in login/register handles the first image. Warm only
  // the next frame immediately, then load the rest in idle slices.
  warm(1, 'high');

  const startWarmup = () => {
    let next = 2;
    const step = (deadline) => {
      const started = performance.now();
      while (next < IMAGES.length && (!deadline || deadline.timeRemaining() > 8) && performance.now() - started < 35) {
        warm(next++, 'low');
      }
      if (next < IMAGES.length) {
        if ('requestIdleCallback' in window) window.requestIdleCallback(step, { timeout: 1200 });
        else window.setTimeout(() => step(null), 180);
      }
    };
    if ('requestIdleCallback' in window) window.requestIdleCallback(step, { timeout: 450 });
    else window.setTimeout(() => step(null), 120);
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

  // Start progressive loading as soon as the DOM is ready; it must not wait
  // for every page asset to finish downloading.
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', startWarmup, { once: true });
  else startWarmup();
}
