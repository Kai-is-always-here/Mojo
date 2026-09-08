const TRAILER = {
  title: 'The Odyssey — Official Trailer',
  vimeoId: '1179178790',
  poster: 'the-odyssey.svg'
};

<<<<<<< HEAD
const POSTERS = [
  'the-odyssey.svg',
  'spider-man-brand-new-day.svg',
  'toy-story-5.svg',
  'michael.svg',
  'project-hail-mary.svg',
  'super-mario-galaxy.svg'
];

=======
>>>>>>> b561565be3819b4e704f2ef2b601e4ebc50e2411
const root = document.querySelector('[data-auth-slideshow]');
if (root) {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fallback = document.createElement('div');
  fallback.className = 'auth-poster-fallback';
  fallback.style.backgroundImage = `url("${root.dataset.posterBase || './'}${TRAILER.poster}")`;
  root.replaceChildren(fallback);

  if (!reduceMotion) {
    const frame = document.createElement('iframe');
    frame.className = 'auth-trailer';
    frame.title = TRAILER.title;
    frame.loading = 'eager';
    frame.allow = 'autoplay; fullscreen; picture-in-picture';
    frame.referrerPolicy = 'strict-origin-when-cross-origin';
    frame.src = `https://player.vimeo.com/video/${TRAILER.vimeoId}?autoplay=1&muted=1&background=1&loop=1&autopause=0&dnt=1&playsinline=1&title=0&byline=0&portrait=0`;
    frame.addEventListener('load', () => root.classList.add('trailer-ready'), { once: true });
    frame.addEventListener('error', () => root.classList.remove('trailer-ready'), { once: true });
    root.appendChild(frame);
  }
}
