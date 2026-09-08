const IMAGES = Array.from({ length: 12 }, (_, index) => `${index + 1}.png`);
const root = document.querySelector('[data-auth-slideshow]');

if (root) {
  const base = root.dataset.posterBase || 'shared/auth/';
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const shuffle = (items) => {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  };

  const order = shuffle(IMAGES);
  const firstUrl = `${base}${order[0]}`;
  root.style.backgroundImage = `url("${firstUrl}")`;
  root.style.backgroundPosition = 'center center';
  root.style.backgroundSize = 'cover';

  const slides = order.map((name, index) => {
    const slide = document.createElement('div');
    slide.className = `auth-slide${index === 0 ? ' is-active' : ''}`;
    slide.setAttribute('aria-hidden', 'true');
    slide.style.backgroundImage = `url("${base}${name}")`;
    root.appendChild(slide);
    return slide;
  });

  // Decode images off the critical UI path. Every slide has its image URL
  // attached up front, so transitions never reveal an empty frame.
  const warm = (index, priority = 'low') => {
    if (index < 0 || index >= order.length) return Promise.resolve();
    const image = new Image();
    image.decoding = 'async';
    if ('fetchPriority' in image) image.fetchPriority = priority;
    image.src = `${base}${order[index]}`;
    return image.decode ? image.decode().catch(() => undefined) : Promise.resolve();
  };

  // Prioritize the first two frames, then decode the remaining frames without
  // blocking first paint.
  warm(0, 'high');
  warm(1, 'high');

  const warmRemaining = () => {
    let next = 2;
    const step = (deadline) => {
      const started = performance.now();
      while (next < order.length && (!deadline || deadline.timeRemaining() > 8) && performance.now() - started < 30) {
        warm(next++, 'low');
      }
      if (next < order.length) {
        if ('requestIdleCallback' in window) window.requestIdleCallback(step, { timeout: 1200 });
        else window.setTimeout(() => step(null), 100);
      }
    };
    if ('requestIdleCallback' in window) window.requestIdleCallback(step, { timeout: 500 });
    else window.setTimeout(() => step(null), 50);
  };

  if (!reduceMotion && slides.length > 1) {
    let active = 0;
    const advance = () => {
      const next = (active + 1) % slides.length;
      slides[active].classList.remove('is-active');
      slides[next].classList.add('is-active');
      active = next;
    };
    // Keep a continuous visual rhythm: cross-fade/zoom never pauses between
    // slides and the randomized order avoids a repetitive sequence.
    window.setInterval(advance, 4300);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', warmRemaining, { once: true });
  else warmRemaining();
}
