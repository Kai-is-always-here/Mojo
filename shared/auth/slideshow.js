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
  const slides = [];
  const preload = new Image();

  const setBackground = (el, poster) => {
    el.style.backgroundImage = `url("${base}${poster}")`;
  };

  const createSlide = (poster, active = false) => {
    const layer = document.createElement('div');
    layer.className = `auth-slide${active ? ' is-active' : ''}`;
    layer.setAttribute('aria-hidden', 'true');
    setBackground(layer, poster);
    root.appendChild(layer);
    slides.push(layer);
    return layer;
  };

  createSlide(POSTERS[0], true);
  if (POSTERS.length > 1) createSlide(POSTERS[1]);

  let current = 0;
  let timer = 0;
  let nextIndex = 1;

  const prepareNext = () => {
    const poster = POSTERS[nextIndex % POSTERS.length];
    preload.src = `${base}${poster}`;
  };

  const rotate = () => {
    const next = (current + 1) % POSTERS.length;
    const incoming = slides[1];
    setBackground(incoming, POSTERS[next]);
    incoming.classList.add('is-active');
    slides[0].classList.remove('is-active');
    slides.push(slides.shift());
    current = next;
    nextIndex = (next + 1) % POSTERS.length;
    prepareNext();
  };

  prepareNext();
  if (!reduceMotion && POSTERS.length > 1) {
    const start = () => { timer = window.setInterval(rotate, 7000); };
    if (document.visibilityState === 'visible') start();
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        window.clearInterval(timer);
        timer = 0;
      } else if (!timer) {
        start();
      }
    });
  }
}
