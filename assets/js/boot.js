(function () {
  document.documentElement.classList.remove('no-js');
  document.documentElement.classList.add('js');
  window.setTimeout(function () {
    if (!document.documentElement.classList.contains('reveal-ready')) {
      document.documentElement.classList.add('js-fallback');
    }
  }, 4000);
})();
