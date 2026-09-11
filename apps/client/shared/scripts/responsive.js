(() => {
  const root = document.documentElement;
  const applyViewport = () => {
    const vv = window.visualViewport;
    const width = Math.max(1, Math.round(vv?.width || window.innerWidth || root.clientWidth));
    const height = Math.max(1, Math.round(vv?.height || window.innerHeight || root.clientHeight));
    root.style.setProperty('--app-width', `${width}px`);
    root.style.setProperty('--app-height', `${height}px`);
    root.style.setProperty('--app-vh', `${height * 0.01}px`);
    root.dataset.viewport = width < 390 ? 'compact' : width < 768 ? 'mobile' : width < 1100 ? 'tablet' : 'desktop';
    root.dataset.orientation = width > height ? 'landscape' : 'portrait';
  };
  let frame = 0;
  const schedule = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(applyViewport);
  };
  applyViewport();
  addEventListener('resize', schedule, { passive: true });
  addEventListener('orientationchange', schedule, { passive: true });
  window.visualViewport?.addEventListener('resize', schedule, { passive: true });
  window.visualViewport?.addEventListener('scroll', schedule, { passive: true });
})();
