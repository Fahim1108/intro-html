/* NeedYourSite — interactions
   No dependencies. Progressive enhancement, reduced-motion aware. */
(function () {
  'use strict';

  var $ = function (sel, scope) { return (scope || document).querySelector(sel); };
  var $$ = function (sel, scope) {
    return Array.prototype.slice.call((scope || document).querySelectorAll(sel));
  };

  document.documentElement.classList.add('reveal-ready');

  var reduceQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  var reduce = function () { return reduceQuery.matches; };
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  var wideScreen = window.matchMedia('(min-width: 48em)');

  var header = $('#siteHeader');
  var heroStage = $('#heroStage');
  var heroBrowsers = $('#heroBrowsers');
  var processTrack = $('#processTrack');

  /* ---------------------------------------------------------
     Scroll: header state, hero depth, process progress
     --------------------------------------------------------- */
  var scrollQueued = false;

  function updateHeader() {
    if (header) header.classList.toggle('is-scrolled', window.scrollY > 20);
  }

  function updateHeroDepth() {
    if (!heroBrowsers || reduce() || !wideScreen.matches) return;
    var depth = Math.min(window.scrollY * 0.055, 36);
    heroBrowsers.style.setProperty('--sy', depth.toFixed(1) + 'px');
  }

  function updateProcess() {
    if (!processTrack) return;
    if (reduce()) {
      processTrack.style.setProperty('--process', '1');
      return;
    }
    var rect = processTrack.getBoundingClientRect();
    var viewport = window.innerHeight;
    var start = viewport * 0.82;
    var end = viewport * 0.18;
    var total = rect.height + (start - end);
    var ratio = total > 0 ? (start - rect.top) / total : 0;
    ratio = Math.max(0, Math.min(1, ratio));
    processTrack.style.setProperty('--process', ratio.toFixed(3));
  }

  function onScroll() {
    if (scrollQueued) return;
    scrollQueued = true;
    window.requestAnimationFrame(function () {
      scrollQueued = false;
      updateHeader();
      updateHeroDepth();
      updateProcess();
    });
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  updateHeader();
  updateHeroDepth();
  updateProcess();

  /* ---------------------------------------------------------
     Reveals
     --------------------------------------------------------- */
  var revealGroups = $$('.build-grid, .reasons, .process__steps, .plans, .projects');
  revealGroups.forEach(function (group) {
    $$('.reveal', group).forEach(function (el, i) {
      el.style.setProperty('--reveal-delay', Math.min(i * 55, 280) + 'ms');
    });
  });

  if (!reduce() && 'IntersectionObserver' in window) {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -6% 0px' });

    $$('.reveal').forEach(function (el) { revealObserver.observe(el); });
  } else {
    $$('.reveal').forEach(function (el) { el.classList.add('is-in'); });
  }

  /* ---------------------------------------------------------
     Desktop-only cursor depth on the hero composition
     --------------------------------------------------------- */
  if (heroStage && heroBrowsers && finePointer.matches && !reduce()) {
    var pointerX = 0;
    var pointerY = 0;
    var pointerQueued = false;

    var applyPointerDepth = function () {
      pointerQueued = false;
      var rect = heroStage.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      var x = ((pointerX - rect.left) / rect.width - 0.5) * 2;
      var y = ((pointerY - rect.top) / rect.height - 0.5) * 2;
      x = Math.max(-1, Math.min(1, x));
      y = Math.max(-1, Math.min(1, y));
      heroBrowsers.style.setProperty('--mx', x.toFixed(3));
      heroBrowsers.style.setProperty('--my', y.toFixed(3));
    };

    heroStage.addEventListener('pointermove', function (event) {
      if (!wideScreen.matches || reduce()) return;
      pointerX = event.clientX;
      pointerY = event.clientY;
      if (!pointerQueued) {
        pointerQueued = true;
        window.requestAnimationFrame(applyPointerDepth);
      }
    });

    heroStage.addEventListener('pointerleave', function () {
      heroBrowsers.style.setProperty('--mx', '0');
      heroBrowsers.style.setProperty('--my', '0');
    });
  }

  /* ---------------------------------------------------------
     Full-screen menu
     --------------------------------------------------------- */
  var menu = $('#menu');
  var menuToggle = $('#menuToggle');
  var menuClose = $('#menuClose');
  var lastMenuFocus = null;

  function menuIsOpen() {
    return !!menu && menu.classList.contains('is-open');
  }

  function menuFocusable() {
    if (!menu) return [];
    return $$('a[href], button:not([disabled])', menu).filter(function (el) {
      return el.getClientRects().length > 0;
    });
  }

  function openMenu() {
    if (!menu || !menuToggle) return;
    lastMenuFocus = document.activeElement;
    menu.classList.add('is-open');
    menu.removeAttribute('inert');
    menu.setAttribute('aria-hidden', 'false');
    menuToggle.setAttribute('aria-expanded', 'true');
    menuToggle.setAttribute('aria-label', 'Close menu');
    document.body.classList.add('menu-open');
    window.setTimeout(function () {
      if (menuClose && menuIsOpen()) menuClose.focus({ preventScroll: true });
    }, 60);
  }

  function closeMenu() {
    if (!menu || !menuToggle || !menuIsOpen()) return;
    menu.classList.remove('is-open');
    menu.setAttribute('inert', '');
    menu.setAttribute('aria-hidden', 'true');
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.setAttribute('aria-label', 'Open menu');
    document.body.classList.remove('menu-open');
    var target = lastMenuFocus && lastMenuFocus.focus ? lastMenuFocus : menuToggle;
    window.setTimeout(function () {
      if (target && document.contains(target)) target.focus({ preventScroll: true });
    }, 30);
    lastMenuFocus = null;
  }

  if (menuToggle) {
    menuToggle.addEventListener('click', function () {
      if (menuIsOpen()) closeMenu();
      else openMenu();
    });
  }
  if (menuClose) menuClose.addEventListener('click', closeMenu);

  if (menu) {
    $$('[data-menu-link]', menu).forEach(function (link) {
      link.addEventListener('click', closeMenu);
    });
  }

  document.addEventListener('keydown', function (event) {
    if (!menuIsOpen()) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      closeMenu();
      return;
    }

    if (event.key !== 'Tab') return;
    var focusable = menuFocusable();
    if (!focusable.length) return;
    var first = focusable[0];
    var last = focusable[focusable.length - 1];

    if (!menu.contains(document.activeElement)) {
      event.preventDefault();
      first.focus();
      return;
    }
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  var desktopQuery = window.matchMedia('(min-width: 64em)');
  var onDesktopChange = function (event) {
    if (event.matches && menuIsOpen()) closeMenu();
  };
  if (desktopQuery.addEventListener) desktopQuery.addEventListener('change', onDesktopChange);

  /* ---------------------------------------------------------
     FAQ accordion
     --------------------------------------------------------- */
  var faqItems = $$('.faq__item');

  function closeFaq(item, immediate) {
    var button = $('.faq__q', item);
    var panel = $('.faq__panel', item);
    if (!button || !panel || button.getAttribute('aria-expanded') !== 'true') return;

    button.setAttribute('aria-expanded', 'false');
    item.classList.remove('is-open');
    panel.setAttribute('aria-hidden', 'true');

    if (immediate || reduce()) {
      panel.hidden = true;
      panel.style.height = '';
      return;
    }

    panel.style.height = panel.scrollHeight + 'px';
    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(function () {
        panel.style.height = '0px';
      });
    });
    window.setTimeout(function () {
      if (button.getAttribute('aria-expanded') === 'false') {
        panel.hidden = true;
        panel.style.height = '';
      }
    }, 410);
  }

  function openFaq(item) {
    var button = $('.faq__q', item);
    var panel = $('.faq__panel', item);
    if (!button || !panel) return;

    button.setAttribute('aria-expanded', 'true');
    item.classList.add('is-open');
    panel.hidden = false;
    panel.setAttribute('aria-hidden', 'false');
    panel.style.height = '0px';

    window.requestAnimationFrame(function () {
      panel.style.height = panel.scrollHeight + 'px';
    });

    window.setTimeout(function () {
      if (button.getAttribute('aria-expanded') === 'true') panel.style.height = 'auto';
    }, 410);
  }

  faqItems.forEach(function (item) {
    var button = $('.faq__q', item);
    if (!button) return;
    button.addEventListener('click', function () {
      var isOpen = button.getAttribute('aria-expanded') === 'true';
      faqItems.forEach(function (other) {
        if (other !== item) closeFaq(other);
      });
      if (isOpen) closeFaq(item);
      else openFaq(item);
    });
  });

  /* ---------------------------------------------------------
     Project dialog
     --------------------------------------------------------- */
  var projectModal = $('#projectModal');
  var projectModalClose = $('#projectModalClose');
  var projectModalTitle = $('#projectModalTitle');
  var projectModalMeta = $('#projectModalMeta');
  var projectModalQuote = $('#projectModalQuote');
  var projectModalDesc = $('#projectModalDesc');
  var projectModalTags = $('#projectModalTags');
  var projectModalFacts = $('#projectModalFacts');
  var projectModalVisual = $('#projectModalVisual');
  var projectModalLabel = $('#projectModalLabel');
  var projectModalNum = $('#projectModalNum');
  var projectModalUrl = $('#projectModalUrl');
  var lastProjectTrigger = null;

  function pad(num) {
    return num < 10 ? '0' + num : String(num);
  }

  function openProject(card, trigger) {
    if (!projectModal || typeof projectModal.showModal !== 'function') return;

    var title = $('.project__title', card);
    var meta = $('.project__meta', card);
    var quote = $('.project__quote', card);
    var desc = $('.project__desc', card);
    var tags = $('.project__tags', card);
    var facts = $('.project__facts', card);
    var mock = $('.project__mock', card);
    if (!title || !mock) return;

    projectModalTitle.innerHTML = title.innerHTML;
    projectModalMeta.innerHTML = meta ? meta.innerHTML : '';
    projectModalQuote.textContent = quote ? quote.textContent : '';
    projectModalDesc.textContent = desc ? desc.textContent : '';
    projectModalTags.textContent = tags ? tags.textContent : '';
    projectModalFacts.innerHTML = facts ? facts.innerHTML : '';

    var clone = mock.cloneNode(true);
    clone.style.width = '100%';
    clone.style.margin = '0';
    projectModalVisual.replaceChildren(clone);

    var cards = $$('.project');
    var index = cards.indexOf(card) + 1;
    projectModalLabel.textContent = pad(index) + ' / ' + pad(cards.length);
    projectModalNum.textContent = pad(index);
    var projectUrl = card.getAttribute('data-project-url') || '';
    if (projectModalUrl) {
      projectModalUrl.hidden = !projectUrl;
      projectModalUrl.href = projectUrl || '#';
    }
    lastProjectTrigger = trigger;
    document.body.classList.add('dialog-open');
    projectModal.showModal();
  }

  document.addEventListener('click', function (event) {
    if (!event.target || typeof event.target.closest !== 'function') return;
    var trigger = event.target.closest('[data-project-open]');
    if (!trigger) return;
    var card = trigger.closest('.project');
    if (card) openProject(card, trigger);
  });

  if (projectModal) {
    if (projectModalClose) {
      projectModalClose.addEventListener('click', function () {
        projectModal.close();
      });
    }

    projectModal.addEventListener('click', function (event) {
      if (event.target === projectModal) projectModal.close();
    });

    projectModal.addEventListener('close', function () {
      document.body.classList.remove('dialog-open');
      if (lastProjectTrigger && document.contains(lastProjectTrigger)) {
        lastProjectTrigger.focus({ preventScroll: true });
      }
      lastProjectTrigger = null;
    });
  }

  /* ---------------------------------------------------------
     Magnetic final CTA — desktop, fine pointer only
     --------------------------------------------------------- */
  var magnetic = $('[data-magnetic]');
  if (magnetic && finePointer.matches && !reduce()) {
    magnetic.addEventListener('pointermove', function (event) {
      var rect = magnetic.getBoundingClientRect();
      if (!rect.width) return;
      var x = (event.clientX - rect.left - rect.width / 2) / (rect.width / 2);
      var y = (event.clientY - rect.top - rect.height / 2) / (rect.height / 2);
      x = Math.max(-1, Math.min(1, x));
      y = Math.max(-1, Math.min(1, y));
      magnetic.style.transform = 'translate3d(' + (x * 7).toFixed(1) + 'px,' + (y * 5).toFixed(1) + 'px,0)';
    });
    magnetic.addEventListener('pointerleave', function () {
      magnetic.style.transform = '';
    });
  }

  /* ---------------------------------------------------------
     Preference changes
     --------------------------------------------------------- */
  var onMotionChange = function () {
    if (reduce()) {
      $$('.reveal').forEach(function (el) { el.classList.add('is-in'); });
      if (processTrack) processTrack.style.setProperty('--process', '1');
    }
  };
  if (reduceQuery.addEventListener) reduceQuery.addEventListener('change', onMotionChange);

  window.addEventListener('load', onScroll, { once: true });
})();
