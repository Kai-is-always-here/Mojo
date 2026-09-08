const IMAGES = Array.from({ length: 12 }, (_, index) => `${index + 1}.png`);
const root = document.querySelector('[data-auth-slideshow]');

if (root) {
  const base = root.dataset.posterBase || 'shared/auth/';
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const slides = IMAGES.map((name, index) => {
    const slide = document.createElement('div');
    slide.className = `auth-slide${index === 0 ? ' is-active' : ''}`;
    slide.setAttribute('aria-hidden', 'true');
    slide.style.backgroundImage = `url("${base}${name}")`;
    root.appendChild(slide);
    return slide;
  });

  // Preload the complete set so transitions stay smooth on mobile.
  IMAGES.forEach((name) => {
    const image = new Image();
    image.decoding = 'async';
    image.src = `${base}${name}`;
  });

  if (!reduceMotion && slides.length > 1) {
    let active = 0;
    window.setInterval(() => {
      slides[active].classList.remove('is-active');
      active = (active + 1) % slides.length;
      slides[active].classList.add('is-active');
    }, 4500);
  }
}
