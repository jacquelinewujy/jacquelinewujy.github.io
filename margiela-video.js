// Plays the Tabi film when it is meaningfully visible, without restarting it.
const margielaVideo = document.querySelector('.margiela-video');

if (margielaVideo) {
  const errorMessage = document.getElementById('margiela-video-error');
  let inView = false;
  let manuallyPaused = false;
  let automaticPause = false;

  const pauseAutomatically = () => {
    if (!margielaVideo.paused) {
      automaticPause = true;
      margielaVideo.pause();
    }
  };
  const playWhenVisible = () => {
    if (inView && !document.hidden && !manuallyPaused && !margielaVideo.ended) {
      margielaVideo.play().catch((error) => console.info('Tabi autoplay was unavailable; native controls remain available.', error));
    }
  };
  margielaVideo.addEventListener('pause', () => {
    if (automaticPause) automaticPause = false;
    else if (inView && !margielaVideo.ended) manuallyPaused = true;
  });
  margielaVideo.addEventListener('play', () => { manuallyPaused = false; });
  const reportError = () => {
    errorMessage.hidden = false;
    console.error('The Tabi film failed to load.', margielaVideo.error);
  };
  margielaVideo.addEventListener('error', reportError);
  margielaVideo.querySelector('source').addEventListener('error', reportError);

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting && entry.intersectionRatio >= 0.5;
      if (inView) playWhenVisible();
      else {
        pauseAutomatically();
        manuallyPaused = false;
      }
    }, { threshold: [0, 0.5] });
    observer.observe(margielaVideo);
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pauseAutomatically();
    else playWhenVisible();
  });
}
