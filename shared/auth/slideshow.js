const POSTERS = [
  'spider-man-brand-new-day.svg',
  'the-odyssey.svg',
  'toy-story-5.svg',
  'michael.svg',
  'project-hail-mary.svg',
  'super-mario-galaxy.svg'
];

const root = document.querySelector('[data-auth-slideshow]');
if (root) {
  const base = root.dataset.posterBase || './';
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  POSTERS.forEach((poster, index) => {
    const layer = document.createElement('div');
    layer.className = `auth-slide${index === 0 ? ' is-active' : ''}`;
    layer.style.backgroundImage = `url('${base}${poster}')`;
    layer.setAttribute('aria-hidden', 'true');
    root.appendChild(layer);
  });
  const slides = [...root.querySelectorAll('.auth-slide')];
  let current = 0;
  if (!reduceMotion && slides.length > 1) {
    window.setInterval(() => {
      slides[current]?.classList.remove('is-active');
      current = (current + 1) % slides.length;
      slides[current]?.classList.add('is-active');
    }, 6000);
  }
}
