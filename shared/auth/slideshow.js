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

  // Keep the visual treatment consistent even if an older cached stylesheet is served.
  const style = document.createElement('style');
  style.textContent = `
    .auth-slide{transition:opacity 1.35s cubic-bezier(.22,.61,.36,1),transform 6.8s cubic-bezier(.16,1,.3,1)!important;transform:scale(1.08) translate3d(0,0,0)!important;will-change:opacity,transform;backface-visibility:hidden}
    .auth-slide.is-active{opacity:1!important;transform:scale(1.015) translate3d(0,0,0)!important}
    .auth-page .auth-topbar .auth-logo{width:min(654px,82vw)!important;height:auto!important;aspect-ratio:13/8;max-width:82vw!important;max-height:210px!important;margin-top:24px!important;object-fit:contain!important;filter:drop-shadow(0 16px 42px rgba(255,198,70,.38))!important}
    .auth-page .auth-topbar .auth-brand-subtitle{margin-top:16px!important}
    @media(max-width:560px){.auth-page .auth-topbar .auth-logo{width:min(654px,82vw)!important;max-width:82vw!important;max-height:190px!important;margin-top:18px!important}.auth-page .auth-topbar .auth-brand-subtitle{margin-top:13px!important}}
    @media(max-height:720px) and (max-width:560px){.auth-page .auth-topbar .auth-logo{width:min(654px,78vw)!important;max-height:150px!important;margin-top:10px!important}.auth-page .auth-topbar .auth-brand-subtitle{margin-top:8px!important}}
    @media(prefers-reduced-motion:reduce){.auth-slide{transition:none!important;transform:none!important}.auth-slide:not(.is-active){display:none!important}}
  `;
  document.head.appendChild(style);

  // Shuffle on every page entry. Fisher-Yates guarantees that every image can
  // appear in any position while keeping the 12-image set intact.
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

  const decoded = new Map();
  const warm = (index, priority = 'low') => {
    if (index < 0 || index >= order.length || decoded.has(index)) return decoded.get(index) || Promise.resolve();
    const image = new Image();
    image.decoding = 'async';
    if ('fetchPriority' in image) image.fetchPriority = priority;
    image.src = `${base}${order[index]}`;
    const promise = image.decode ? image.decode().catch(() => undefined) : Promise.resolve();
    decoded.set(index, promise);
    return promise;
  };

  // Make the first two frames available immediately; then decode the rest
  // without blocking the first paint.
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
        if ('requestIdleCallback' in window) window.requestIdleCallback(step, { timeout: 1000 });
        else window.setTimeout(() => step(null), 80);
      }
    };
    if ('requestIdleCallback' in window) window.requestIdleCallback(step, { timeout: 350 });
    else window.setTimeout(() => step(null), 40);
  };

  if (!reduceMotion && slides.length > 1) {
    let active = 0;
    // Start the transition only after the next frame is decoded. This removes
    // the visible "pause" that can happen when a network image is still cold.
    const advance = async () => {
      const next = (active + 1) % slides.length;
      await warm(next, 'high');
      slides[next].classList.add('is-active');
      slides[active].classList.remove('is-active');
      active = next;
    };
    window.setInterval(advance, 4300);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', warmRemaining, { once: true });
  else warmRemaining();
}
