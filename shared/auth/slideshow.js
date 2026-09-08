const IMAGES = Array.from({ length: 12 }, (_, index) => `${index + 1}.png`);
const root = document.querySelector('[data-auth-slideshow]');

if (root) {
  const base = root.dataset.posterBase || 'shared/auth/';
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Put the first frame on the paint path immediately. Do not wait for all
  // twelve images to download before showing the page.
  const first = new Image();
  first.decoding = 'async';
  first.fetchPriority = 'high';
  first.src = `${base}${IMAGES[0]}`;
  root.style.backgroundImage = `url("${base}${IMAGES[0]}")`;
  root.style.backgroundPosition = 'center center';
  root.style.backgroundSize = 'cover';

  const slides = IMAGES.map((name, index) => {
    const slide = document.createElement('div');
    slide.className = `auth-slide${index === 0 ? ' is-active' : ''}`;
    slide.setAttribute('aria-hidden', 'true');
    slide.style.backgroundImage = `url("${base}${name}")`;
    root.appendChild(slide);
    return slide;
  });

  // Preload the remaining frames after the first frame has been requested.
  // requestIdleCallback prevents the slideshow from competing with the
  // initial login/register UI on slower phones.
  const preloadRest = () => {
    IMAGES.slice(1).forEach((name) => {
      const image = new Image();
      image.decoding = 'async';
      image.fetchPriority = 'low';
      image.src = `${base}${name}`;
    });
  };

  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(preloadRest, { timeout: 1800 });
  } else {
    window.setTimeout(preloadRest, 900);
  }

  if (!reduceMotion && slides.length > 1) {
    let active = 0;
    window.setInterval(() => {
      slides[active].classList.remove('is-active');
      active = (active + 1) % slides.length;
      slides[active].classList.add('is-active');
    }, 4500);
  }
}
