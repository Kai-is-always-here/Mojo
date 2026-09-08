const IMAGES = Array.from({ length: 12 }, (_, index) => `${index + 1}.png`);
const root = document.querySelector('[data-auth-slideshow]');

if (root) {
  const base = root.dataset.posterBase || 'shared/auth/';
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const firstUrl = `${base}${IMAGES[0]}`;

  // First frame is available immediately; the remaining large images are
  // warmed progressively so navigation is not blocked by a 25MB+ download.
  root.style.backgroundImage = `url("${firstUrl}")`;
  root.style.backgroundPosition = 'center center';
  root.style.backgroundSize = 'cover';

  const slides = IMAGES.map((name, index) => {
    const slide = document.createElement('div');
    slide.className = `auth-slide${index === 0 ? ' is-active' : ''}`;
    slide.setAttribute('aria-hidden', 'true');
    if (index === 0) slide.style.backgroundImage = `url("${base}${name}")`;
    root.appendChild(slide);
    return slide;
  });

  const warm = (index, priority = 'low') => {
    if (index < 0 || index >= IMAGES.length) return;
    const image = new Image();
    image.decoding = 'async';
    if ('fetchPriority' in image) image.fetchPriority = priority;
    image.src = `${base}${IMAGES[index]}`;
  };

  const reveal = (index) => {
    if (!slides[index].style.backgroundImage) {
      slides[index].style.backgroundImage = `url("${base}${IMAGES[index]}")`;
    }
    warm((index + 1) % IMAGES.length, 'high');
  };

  warm(0, 'high');

  const startWarmup = () => {
    let next = 1;
    const step = () => {
      if (next >= IMAGES.length) return;
      warm(next++, 'low');
      if (next < IMAGES.length) {
        if ('requestIdleCallback' in window) {
          window.requestIdleCallback(step, { timeout: 1000 });
        } else {
          window.setTimeout(step, 140);
        }
      }
    };
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(step, { timeout: 350 });
    } else {
      window.setTimeout(step, 80);
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
    window.addEventListener('load', startWarmup, { once: true });
  } else {
    startWarmup();
  }
}
