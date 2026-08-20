const menuButton = document.querySelector('.menu-toggle');
const siteNav = document.querySelector('.site-nav');
const moreDropdowns = document.querySelectorAll('.nav-more');
const desktopHoverNavigation = window.matchMedia('(hover: hover) and (pointer: fine)');
const desktopNavigationLayout = window.matchMedia('(min-width: 721px)');

const openMoreDropdown = (dropdown) => {
  const button = dropdown.querySelector('.more-toggle');
  closeOtherMoreDropdowns(dropdown);
  button?.setAttribute('aria-expanded', 'true');
  dropdown.classList.add('is-open');
};

const closeMoreDropdown = (dropdown, returnFocus = false) => {
  const button = dropdown.querySelector('.more-toggle');
  button?.setAttribute('aria-expanded', 'false');
  dropdown.classList.remove('is-open');
  if (returnFocus) button?.focus();
};

const closeOtherMoreDropdowns = (activeDropdown) => {
  moreDropdowns.forEach((dropdown) => {
    if (dropdown !== activeDropdown) closeMoreDropdown(dropdown);
  });
};

menuButton?.addEventListener('click', () => {
  const isOpen = menuButton.getAttribute('aria-expanded') === 'true';
  menuButton.setAttribute('aria-expanded', String(!isOpen));
  siteNav.classList.toggle('is-open', !isOpen);
});

moreDropdowns.forEach((dropdown) => {
  const button = dropdown.querySelector('.more-toggle');
  const isDesktopHeaderDropdown = () => desktopNavigationLayout.matches
    && desktopHoverNavigation.matches
    && Boolean(dropdown.closest('.site-nav'));
  let pointerIsInside = false;
  let focusIsInside = false;

  const syncDesktopDropdown = () => {
    if (!isDesktopHeaderDropdown()) return;
    if (pointerIsInside || focusIsInside) openMoreDropdown(dropdown);
    else closeMoreDropdown(dropdown);
  };

  dropdown.addEventListener('mouseenter', () => {
    if (!isDesktopHeaderDropdown()) return;
    pointerIsInside = true;
    syncDesktopDropdown();
  });

  dropdown.addEventListener('mouseleave', () => {
    if (!isDesktopHeaderDropdown()) return;
    pointerIsInside = false;
    syncDesktopDropdown();
  });

  dropdown.addEventListener('focusin', () => {
    if (!isDesktopHeaderDropdown()) return;
    focusIsInside = true;
    syncDesktopDropdown();
  });

  dropdown.addEventListener('focusout', () => {
    if (!isDesktopHeaderDropdown()) return;
    window.requestAnimationFrame(() => {
      focusIsInside = dropdown.contains(document.activeElement);
      syncDesktopDropdown();
    });
  });

  button?.addEventListener('click', (event) => {
    if (isDesktopHeaderDropdown()) {
      if (event.detail > 0) button.blur();
      return;
    }

    const isOpen = button.getAttribute('aria-expanded') === 'true';
    closeOtherMoreDropdowns(dropdown);
    button.setAttribute('aria-expanded', String(!isOpen));
    dropdown.classList.toggle('is-open', !isOpen);
  });
});

document.addEventListener('click', (event) => {
  moreDropdowns.forEach((dropdown) => {
    if (!dropdown.contains(event.target)) closeMoreDropdown(dropdown);
  });
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    moreDropdowns.forEach((dropdown) => {
      if (dropdown.classList.contains('is-open')) closeMoreDropdown(dropdown, true);
    });
    menuButton?.setAttribute('aria-expanded', 'false');
    siteNav?.classList.remove('is-open');
  }
});

// On touch devices, the About Me interest overlays toggle on tap instead of hover.
const interestToggles = [...document.querySelectorAll('[data-interest-toggle]')];
const interestHoverInteraction = window.matchMedia('(hover: hover) and (pointer: fine)');
const compactInterestLayout = window.matchMedia('(max-width: 720px)');

const setInterestExpanded = (interest, isExpanded) => {
  interest.classList.toggle('is-active', isExpanded);
  interest.setAttribute('aria-expanded', String(isExpanded));
};

interestToggles.forEach((interest) => {
  interest.addEventListener('click', () => {
    if (interestHoverInteraction.matches && !compactInterestLayout.matches) return;
    const shouldOpen = interest.getAttribute('aria-expanded') !== 'true';
    interestToggles.forEach((item) => setInterestExpanded(item, item === interest && shouldOpen));
  });
});

interestHoverInteraction.addEventListener?.('change', (event) => {
  if (event.matches && !compactInterestLayout.matches) {
    interestToggles.forEach((interest) => setInterestExpanded(interest, false));
  }
});

compactInterestLayout.addEventListener?.('change', (event) => {
  if (!event.matches && interestHoverInteraction.matches) {
    interestToggles.forEach((interest) => setInterestExpanded(interest, false));
  }
});

// Types the selected About Me skill while briefly pressing its keyboard key.
const skillsKeyboard = document.querySelector('[data-skills-keyboard]');

if (skillsKeyboard) {
  const skillKeys = [...skillsKeyboard.querySelectorAll('[data-skill-name]')];
  const skillOutput = skillsKeyboard.querySelector('[data-skill-output]');
  const skillCaret = skillsKeyboard.querySelector('[data-skill-caret]');
  const reducedSkillMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let typingTimer;
  let pressTimer;

  const typeSkillName = (name) => {
    window.clearTimeout(typingTimer);

    if (reducedSkillMotion.matches) {
      skillOutput.textContent = name;
      skillCaret.hidden = true;
      return;
    }

    let characterIndex = 0;
    skillOutput.textContent = '';
    skillCaret.hidden = false;

    const typeNextCharacter = () => {
      characterIndex += 1;
      skillOutput.textContent = name.slice(0, characterIndex);

      if (characterIndex < name.length) {
        typingTimer = window.setTimeout(typeNextCharacter, 80);
      } else {
        skillCaret.hidden = true;
      }
    };

    typeNextCharacter();
  };

  skillKeys.forEach((key) => {
    key.addEventListener('click', () => {
      window.clearTimeout(pressTimer);
      skillKeys.forEach((item) => {
        item.classList.remove('is-pressed');
        item.classList.toggle('is-selected', item === key);
      });

      key.classList.add('is-pressed');
      pressTimer = window.setTimeout(() => key.classList.remove('is-pressed'), 140);
      typeSkillName(key.dataset.skillName);
    });
  });
}

// Keeps each project page's section directory synchronized with its headings.
document.querySelectorAll('.case-study-directory').forEach((directory) => {
  const links = [...directory.querySelectorAll('a[href^="#"]')];
  const targets = links
    .map((link) => document.getElementById(decodeURIComponent(link.hash.slice(1))))
    .filter(Boolean);

  if (!targets.length) return;

  const setActiveDirectoryTarget = (target) => {
    links.forEach((link) => {
      const isActive = link.hash === `#${target.id}`;
      if (isActive) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  };

  const updateActiveDirectoryTarget = () => {
    const activationLine = window.innerHeight * 0.3;
    let activeTarget = targets[0];

    targets.forEach((target) => {
      if (target.getBoundingClientRect().top <= activationLine) activeTarget = target;
    });

    setActiveDirectoryTarget(activeTarget);
  };

  links.forEach((link) => {
    link.addEventListener('click', () => {
      const target = document.getElementById(decodeURIComponent(link.hash.slice(1)));
      if (target) setActiveDirectoryTarget(target);
    });
  });

  if ('IntersectionObserver' in window) {
    const sectionObserver = new IntersectionObserver(updateActiveDirectoryTarget, {
      rootMargin: '-15% 0px -65% 0px',
      threshold: [0, 1]
    });
    targets.forEach((target) => sectionObserver.observe(target));
  }

  updateActiveDirectoryTarget();
});

// Manual architecture image carousel; intentionally does not autoplay.
document.querySelectorAll('[data-carousel]').forEach((carousel) => {
  const slides = [...carousel.querySelectorAll('[data-carousel-slide]')];
  const previousButton = carousel.querySelector('[data-carousel-previous]');
  const nextButton = carousel.querySelector('[data-carousel-next]');
  const status = carousel.querySelector('[data-carousel-status]');
  let currentIndex = 0;

  const showSlide = (index) => {
    currentIndex = (index + slides.length) % slides.length;
    slides.forEach((slide, slideIndex) => {
      slide.hidden = slideIndex !== currentIndex;
    });
    if (status) status.textContent = `${currentIndex + 1} of ${slides.length}`;
  };

  previousButton?.addEventListener('click', () => showSlide(currentIndex - 1));
  nextButton?.addEventListener('click', () => showSlide(currentIndex + 1));
});

// Enlarges Architecture drawings while preserving direct image links as a fallback.
const architectureLightbox = document.querySelector('.architecture-lightbox');
const architectureLightboxImage = architectureLightbox?.querySelector('.architecture-lightbox-image');
const architectureLightboxTitle = architectureLightbox?.querySelector('#architecture-lightbox-title');
const architectureLightboxClose = architectureLightbox?.querySelector('.architecture-lightbox-close');

document.querySelectorAll('.lightbox-trigger').forEach((trigger) => {
  trigger.addEventListener('click', (event) => {
    if (!architectureLightbox?.showModal || !architectureLightboxImage || !architectureLightboxTitle) return;
    event.preventDefault();
    architectureLightboxImage.src = trigger.href;
    architectureLightboxImage.alt = trigger.querySelector('img')?.alt || '';
    architectureLightboxTitle.textContent = trigger.dataset.lightboxLabel || '';
    architectureLightbox.showModal();
  });
});

architectureLightboxClose?.addEventListener('click', () => architectureLightbox.close());
architectureLightbox?.addEventListener('click', (event) => {
  if (event.target === architectureLightbox) architectureLightbox.close();
});

// Keeps the Wayable screenshot carousel centered, focused, and synchronized
// with its draggable scrollbar without adding a third-party dependency.
document.querySelectorAll('[data-wayable-carousel]').forEach((carousel) => {
  const track = carousel.querySelector('[data-wayable-track]');
  const slides = [...carousel.querySelectorAll('[data-wayable-slide]')];
  const scrollbar = carousel.querySelector('[data-wayable-scrollbar]');
  const thumb = carousel.querySelector('[data-wayable-thumb]');

  if (!track || !slides.length || !scrollbar || !thumb) return;

  let activeIndex = Math.min(1, slides.length - 1);
  let animationFrame;
  let isDragging = false;
  let dragStartX = 0;
  let dragStartScrollLeft = 0;

  const maximumScroll = () => Math.max(0, track.scrollWidth - track.clientWidth);

  const setActiveSlide = (index) => {
    activeIndex = Math.max(0, Math.min(slides.length - 1, index));
    slides.forEach((slide, slideIndex) => {
      const isActive = slideIndex === activeIndex;
      slide.classList.toggle('is-active', isActive);
      if (isActive) slide.setAttribute('aria-current', 'true');
      else slide.removeAttribute('aria-current');
    });
  };

  const findCenteredSlide = () => {
    const viewportCenter = track.scrollLeft + (track.clientWidth / 2);
    let closestIndex = 0;
    let closestDistance = Number.POSITIVE_INFINITY;

    slides.forEach((slide, index) => {
      const slideCenter = slide.offsetLeft + (slide.offsetWidth / 2);
      const distance = Math.abs(slideCenter - viewportCenter);
      if (distance < closestDistance) {
        closestIndex = index;
        closestDistance = distance;
      }
    });

    setActiveSlide(closestIndex);
  };

  const updateScrollbar = () => {
    const maxScroll = maximumScroll();
    const visibleRatio = Math.min(1, track.clientWidth / track.scrollWidth);
    const thumbWidth = Math.max(32, scrollbar.clientWidth * visibleRatio);
    const thumbTravel = Math.max(0, scrollbar.clientWidth - thumbWidth);
    const progress = maxScroll ? track.scrollLeft / maxScroll : 0;

    thumb.style.width = `${thumbWidth}px`;
    thumb.style.left = `${progress * thumbTravel}px`;
    scrollbar.setAttribute('aria-valuenow', String(Math.round(progress * 100)));
  };

  const updateCarousel = () => {
    findCenteredSlide();
    updateScrollbar();
  };

  const queueCarouselUpdate = () => {
    window.cancelAnimationFrame(animationFrame);
    animationFrame = window.requestAnimationFrame(updateCarousel);
  };

  const centeredScrollPosition = (slide) => {
    const desiredPosition = slide.offsetLeft - ((track.clientWidth - slide.offsetWidth) / 2);
    return Math.max(0, Math.min(maximumScroll(), desiredPosition));
  };

  const scrollToSlide = (index, behavior = 'smooth') => {
    const boundedIndex = Math.max(0, Math.min(slides.length - 1, index));
    setActiveSlide(boundedIndex);
    track.scrollTo({ left: centeredScrollPosition(slides[boundedIndex]), behavior });
  };

  const handleCarouselKeydown = (event) => {
    let nextIndex;
    if (event.key === 'ArrowLeft') nextIndex = activeIndex - 1;
    if (event.key === 'ArrowRight') nextIndex = activeIndex + 1;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = slides.length - 1;
    if (nextIndex === undefined) return;

    event.preventDefault();
    scrollToSlide(nextIndex);
  };

  const finishScrollbarDrag = (event) => {
    if (!isDragging) return;
    isDragging = false;
    scrollbar.classList.remove('is-dragging');
    track.style.removeProperty('scroll-snap-type');
    if (scrollbar.hasPointerCapture(event.pointerId)) scrollbar.releasePointerCapture(event.pointerId);
    scrollToSlide(activeIndex);
  };

  track.addEventListener('scroll', queueCarouselUpdate, { passive: true });
  track.addEventListener('keydown', handleCarouselKeydown);
  scrollbar.addEventListener('keydown', handleCarouselKeydown);

  scrollbar.addEventListener('pointerdown', (event) => {
    const scrollbarRect = scrollbar.getBoundingClientRect();
    const thumbWidth = thumb.offsetWidth;
    const thumbTravel = Math.max(0, scrollbar.clientWidth - thumbWidth);

    if (event.target !== thumb && thumbTravel) {
      const requestedThumbPosition = event.clientX - scrollbarRect.left - (thumbWidth / 2);
      const progress = Math.max(0, Math.min(1, requestedThumbPosition / thumbTravel));
      track.scrollLeft = progress * maximumScroll();
      updateCarousel();
    }

    isDragging = true;
    dragStartX = event.clientX;
    dragStartScrollLeft = track.scrollLeft;
    scrollbar.classList.add('is-dragging');
    track.style.setProperty('scroll-snap-type', 'none');
    scrollbar.setPointerCapture(event.pointerId);
    event.preventDefault();
  });

  scrollbar.addEventListener('pointermove', (event) => {
    if (!isDragging) return;
    const thumbTravel = Math.max(1, scrollbar.clientWidth - thumb.offsetWidth);
    const scrollPerPixel = maximumScroll() / thumbTravel;
    track.scrollLeft = dragStartScrollLeft + ((event.clientX - dragStartX) * scrollPerPixel);
    updateCarousel();
  });

  scrollbar.addEventListener('pointerup', finishScrollbarDrag);
  scrollbar.addEventListener('pointercancel', finishScrollbarDrag);

  if ('ResizeObserver' in window) {
    const carouselResizeObserver = new ResizeObserver(() => {
      scrollToSlide(activeIndex, 'auto');
      updateScrollbar();
    });
    carouselResizeObserver.observe(track);
  } else {
    window.addEventListener('resize', () => {
      scrollToSlide(activeIndex, 'auto');
      updateScrollbar();
    });
  }

  window.requestAnimationFrame(() => {
    scrollToSlide(activeIndex, 'auto');
    updateCarousel();
  });
});

// Plays the Smart Chessboard demo while at least half of it is visible.
const smartChessboardDemo = document.querySelector('.smart-chessboard-demo');
const smartChessboardVideoError = document.querySelector('.smart-chessboard-video-error');

if (smartChessboardDemo) {
  const reportSmartChessboardVideoError = () => {
    const mediaError = smartChessboardDemo.error;
    smartChessboardVideoError?.removeAttribute('hidden');
    console.error('The Smart Chessboard demo video failed to load.', {
      code: mediaError?.code,
      message: mediaError?.message,
      networkState: smartChessboardDemo.networkState,
      readyState: smartChessboardDemo.readyState
    });
  };

  smartChessboardDemo.addEventListener('error', reportSmartChessboardVideoError);
  smartChessboardDemo.querySelectorAll('source').forEach((source) => {
    source.addEventListener('error', reportSmartChessboardVideoError);
  });

  if ('IntersectionObserver' in window) {
    const smartChessboardVideoObserver = new IntersectionObserver(([entry]) => {
      const isMeaningfullyVisible = entry.isIntersecting && entry.intersectionRatio >= 0.5;

      if (isMeaningfullyVisible && !smartChessboardDemo.ended) {
        smartChessboardDemo.play().catch((error) => {
          console.warn('The Smart Chessboard demo could not autoplay.', error);
        });
      } else if (!isMeaningfullyVisible) {
        smartChessboardDemo.pause();
      }
    }, { threshold: [0, 0.5] });

    smartChessboardVideoObserver.observe(smartChessboardDemo);
  }
}

// Renders the Home hero's text-based Hello Kitty one complete row at a time.
const homeKittyTrigger = document.querySelector('[data-home-kitty-trigger]');
const homeKittyArt = document.querySelector('[data-home-kitty-art]');

if (homeKittyTrigger && homeKittyArt) {
  const homeKittyLines = [
    '⠀⠀⠀⢠⡾⠲⠶⣤⣀⣠⣤⣤⣤⡿⠛⠿⡴⠾⠛⢻⡆⠀⠀⠀',
    '⠀⠀⠀⣼⠁⠀⠀⠀⠉⠁⠀⢀⣿⠐⡿⣿⠿⣶⣤⣤⣷⡀⠀⠀',
    '⠀⠀⠀⢹⡶⠀⠀⠀⠀⠀⠀⠌⢯⣡⣿⣿⣀⣸⣿⣦⢓⡟⠀⠀',
    '⠀⠀⢀⡿⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠉⠹⣍⣭⣾⠁⠀⠀',
    '⠀⣀⣸⣇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣸⣷⣤⡀',
    '⠈⠉⠹⣏⡁⠀⢸⣿⠀⠀⠀⠀⠀⠀⠀⠀⣿⡇⠀⢀⣸⣇⣀⠀',
    '⠀⠐⠋⢻⣅⣄⢀⣀⣀⡀⠀⠯⠽⠀⢀⣀⣀⡀⠀⣤⣿⠀⠉⠀',
    '⠀⠀⠴⠛⠙⣳⠋⠉⠉⠙⣆⠀⠀⢰⡟⠉⠈⠙⢷⠟⠉⠙⠂⠀',
    '⠀⠀⠀⠀⠀⢻⣄⣠⣤⣴⠟⠛⠛⠛⢧⣤⣤⣀⡾⠀⠀⠀⠀⠀'
  ];
  const reducedHomeKittyMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let homeKittyTimer = 0;

  const clearHomeKittyTimer = () => {
    window.clearTimeout(homeKittyTimer);
    homeKittyTimer = 0;
  };

  const positionHomeKitty = () => {
    if (homeKittyArt.hidden) return;

    const copy = homeKittyTrigger.closest('.home-hero-copy');
    if (!copy) return;

    const copyRect = copy.getBoundingClientRect();
    const triggerRect = homeKittyTrigger.getBoundingClientRect();
    homeKittyArt.style.left = `${triggerRect.left - copyRect.left + (triggerRect.width / 2)}px`;
    homeKittyArt.style.top = `${triggerRect.top - copyRect.top - homeKittyArt.offsetHeight - 8}px`;
    homeKittyArt.style.setProperty('--kitty-shift-x', '0px');

    const artRect = homeKittyArt.getBoundingClientRect();
    const viewportPadding = 8;
    let horizontalShift = 0;
    if (artRect.left < viewportPadding) horizontalShift = viewportPadding - artRect.left;
    else if (artRect.right > window.innerWidth - viewportPadding) horizontalShift = (window.innerWidth - viewportPadding) - artRect.right;
    homeKittyArt.style.setProperty('--kitty-shift-x', `${horizontalShift}px`);
  };

  const hideHomeKitty = () => {
    clearHomeKittyTimer();
    homeKittyArt.textContent = '';
    homeKittyArt.hidden = true;
    homeKittyTrigger.setAttribute('aria-expanded', 'false');
  };

  const showHomeKitty = () => {
    clearHomeKittyTimer();
    homeKittyArt.textContent = '';
    homeKittyArt.hidden = false;
    homeKittyTrigger.setAttribute('aria-expanded', 'true');
    positionHomeKitty();

    if (reducedHomeKittyMotion.matches) {
      homeKittyArt.textContent = homeKittyLines.join('\n');
      positionHomeKitty();
      return;
    }

    let visibleLineCount = 0;
    const revealNextLine = () => {
      visibleLineCount += 1;
      homeKittyArt.textContent = homeKittyLines.slice(0, visibleLineCount).join('\n');
      positionHomeKitty();
      if (visibleLineCount < homeKittyLines.length) homeKittyTimer = window.setTimeout(revealNextLine, 80);
      else homeKittyTimer = 0;
    };
    revealNextLine();
  };

  homeKittyTrigger.addEventListener('click', () => {
    if (homeKittyArt.hidden) showHomeKitty();
    else hideHomeKitty();
  });

  window.addEventListener('resize', positionHomeKitty);
  reducedHomeKittyMotion.addEventListener?.('change', (event) => {
    if (!event.matches || homeKittyArt.hidden) return;
    clearHomeKittyTimer();
    homeKittyArt.textContent = homeKittyLines.join('\n');
    positionHomeKitty();
  });
}
