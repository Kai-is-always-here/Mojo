const TRAILERS = [
  { title: 'The Odyssey', id: 'AyIZ9tiiN8I', poster: 'the-odyssey.svg' },
  { title: 'Michael', id: 'tPutYyjGoEs', poster: 'michael.svg' },
  { title: 'Project Hail Mary', id: 'P0XN3-n-2Lo', poster: 'project-hail-mary.svg' }
];

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
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const supportsIframe = !reduceMotion && TRAILERS.length > 0;
  const soundButton = document.querySelector('[data-trailer-sound]');
  let activeFrame = null;
  let soundEnabled = false;

  const makeIframe = (trailer) => {
    const frame = document.createElement('iframe');
    frame.className = 'auth-trailer';
    frame.title = `${trailer.title} trailer`;
    frame.loading = 'eager';
    frame.allow = 'autoplay; encrypted-media; picture-in-picture';
    frame.referrerPolicy = 'strict-origin-when-cross-origin';
    frame.src = `https://www.youtube-nocookie.com/embed/${trailer.id}?autoplay=1&mute=1&controls=0&loop=1&playlist=${trailer.id}&playsinline=1&rel=0&modestbranding=1&iv_load_policy=3`;
    root.appendChild(frame);
    activeFrame = frame;
    return frame;
  };

  const postYouTube = (func, args = []) => {
    if (!activeFrame?.contentWindow) return;
    activeFrame.contentWindow.postMessage(JSON.stringify({
      event: 'command',
      func,
      args
    }), '*');
  };

  if (supportsIframe) {
    makeIframe(TRAILERS[0]);
    if (soundButton) {
      soundButton.hidden = false;
      soundButton.addEventListener('click', () => {
        soundEnabled = !soundEnabled;
        if (soundEnabled) {
          postYouTube('unMute');
          postYouTube('setVolume', [50]);
          soundButton.textContent = '🔊 50%';
          soundButton.setAttribute('aria-pressed', 'true');
        } else {
          postYouTube('mute');
          soundButton.textContent = '🔇 Sound';
          soundButton.setAttribute('aria-pressed', 'false');
        }
      });
    }
  } else {
    const fallback = document.createElement('div');
    fallback.className = 'auth-poster-fallback';
    fallback.style.backgroundImage = `url("${root.dataset.posterBase || './'}${POSTERS[0]}")`;
    root.appendChild(fallback);
    if (soundButton) soundButton.hidden = true;
  }
}
