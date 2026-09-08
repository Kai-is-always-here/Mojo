const TRAILERS = [
  { title: 'The Odyssey', id: 'AyIZ9tiiN8I', poster: 'the-odyssey.svg' },
  { title: 'Michael', id: 'tPutYyjGoEs', poster: 'michael.svg' },
  { title: 'Project Hail Mary', id: 'P0XN3-n-2Lo', poster: 'project-hail-mary.svg' }
];
const POSTERS = ['spider-man-brand-new-day.svg','the-odyssey.svg','toy-story-5.svg','michael.svg','project-hail-mary.svg','super-mario-galaxy.svg'];
const root = document.querySelector('[data-auth-slideshow]');
if (root) {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const supportsIframe = !reduceMotion && TRAILERS.length > 0;
  let activeFrame = null, trailerIndex = 0, timer = 0;
  const makeIframe = (trailer) => {
    const frame = document.createElement('iframe');
    frame.className = 'auth-trailer';
    frame.title = `${trailer.title} trailer`;
    frame.loading = 'eager';
    frame.allow = 'autoplay; encrypted-media; picture-in-picture';
    frame.referrerPolicy = 'strict-origin-when-cross-origin';
    frame.src = `https://www.youtube-nocookie.com/embed/${trailer.id}?autoplay=1&mute=1&controls=0&loop=1&playlist=${trailer.id}&playsinline=1&enablejsapi=1&rel=0&modestbranding=1&iv_load_policy=3`;
    root.replaceChildren();
    const fallback = document.createElement('div');
    fallback.className = 'auth-poster-fallback';
    fallback.style.backgroundImage = `url("${root.dataset.posterBase || './'}${trailer.poster}")`;
    root.appendChild(fallback);
    root.appendChild(frame);
    activeFrame = frame;
  };
  const rotate = () => {
    trailerIndex = (trailerIndex + 1) % TRAILERS.length;
    makeIframe(TRAILERS[trailerIndex]);
  };
  if (supportsIframe) {
    makeIframe(TRAILERS[0]);
    const start = () => { timer = window.setInterval(rotate, 12000); };
    if (document.visibilityState === 'visible') start();
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') { window.clearInterval(timer); timer = 0; }
      else if (!timer) start();
    });
  } else {
    const fallback = document.createElement('div');
    fallback.className = 'auth-poster-fallback';
    fallback.style.backgroundImage = `url("${root.dataset.posterBase || './'}${POSTERS[0]}")`;
    root.appendChild(fallback);
  }
}
