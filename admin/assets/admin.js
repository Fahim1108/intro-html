(function () {
  'use strict';

  var navItems = [
    { page: 'overview', label: 'Overview', href: '/admin', icon: '<path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z"/>' },
    { page: 'inquiries', label: 'Inquiries', href: '/admin/inquiries', icon: '<path d="M4 4h16v12H7l-3 3z"/><path d="M8 8h8M8 11h5"/>' },
    { page: 'projects', label: 'Projects', href: '/admin/projects', icon: '<path d="M4 7h16v12H4zM8 7V5h8v2"/><path d="M4 12h16"/>' },
    { page: 'services', label: 'Services & pricing', href: '/admin/services', icon: '<path d="M4 7h16M4 12h16M4 17h10"/><circle cx="17" cy="17" r="2"/>' },
    { page: 'settings', label: 'Settings', href: '/admin/settings', icon: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1"/>' }
  ];

  function svg(paths) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="square" stroke-linejoin="miter" aria-hidden="true">' + paths + '</svg>';
  }

  function qs(selector, scope) { return (scope || document).querySelector(selector); }
  function qsa(selector, scope) { return Array.prototype.slice.call((scope || document).querySelectorAll(selector)); }

  async function api(path, options) {
    var opts = Object.assign({ method: 'GET', credentials: 'same-origin' }, options || {});
    var headers = Object.assign({ Accept: 'application/json' }, opts.headers || {});
    var body = opts.body;
    if (body && !(body instanceof FormData) && typeof body !== 'string') {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(body);
    }
    opts.headers = headers;
    if (body !== undefined) opts.body = body;

    var response;
    try {
      response = await fetch(path, opts);
    } catch (error) {
      var networkError = new Error('Could not reach the server. Check your connection and try again.');
      networkError.cause = error;
      throw networkError;
    }

    if (response.status === 401) {
      window.location.assign('/admin/login?next=' + encodeURIComponent(window.location.pathname));
      throw new Error('Your session has expired.');
    }

    var data = {};
    try { data = await response.json(); } catch (error) { data = {}; }
    if (!response.ok) {
      var apiError = new Error(data.error || 'The request could not be completed.');
      apiError.status = response.status;
      apiError.fields = data.fields || null;
      throw apiError;
    }
    return data;
  }

  function formatDate(value) {
    if (!value) return '—';
    var date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
  }

  function formatDateTime(value) {
    if (!value) return '—';
    var date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    }).format(date);
  }

  function formatCurrency(value) {
    return '৳' + new Intl.NumberFormat('en-US').format(Number(value) || 0);
  }

  function statusSlug(status) {
    return String(status || '').toLowerCase().replace(/\s+/g, '-');
  }

  function statusBadge(status) {
    var badge = document.createElement('span');
    badge.className = 'badge badge--' + statusSlug(status);
    badge.textContent = status || 'NEW';
    return badge;
  }

  function makeElement(tag, className, text) {
    var element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function initials(email) {
    var local = String(email || '').split('@')[0].replace(/[^a-zA-Z0-9]/g, '');
    return (local.slice(0, 2) || 'NY').toUpperCase();
  }

  var toastStack;
  function toast(message, type) {
    if (!toastStack) {
      toastStack = document.createElement('div');
      toastStack.className = 'toast-stack';
      toastStack.setAttribute('aria-live', 'polite');
      document.body.appendChild(toastStack);
    }
    var item = document.createElement('div');
    item.className = 'toast' + (type === 'error' ? ' toast--error' : '');
    item.appendChild(makeElement('span', 'toast__icon', type === 'error' ? '!' : '✓'));
    item.appendChild(makeElement('span', '', message));
    toastStack.appendChild(item);
    window.setTimeout(function () {
      item.style.opacity = '0';
      window.setTimeout(function () { item.remove(); }, 250);
    }, 4800);
  }

  var confirmDialog;
  function ensureConfirmDialog() {
    if (confirmDialog) return confirmDialog;
    confirmDialog = document.createElement('dialog');
    confirmDialog.className = 'adialog';
    confirmDialog.setAttribute('aria-labelledby', 'confirmTitle');
    confirmDialog.innerHTML =
      '<div class="adialog__head">' +
        '<p class="adialog__label">Confirm action</p>' +
        '<button class="adialog__close" type="button" data-confirm-cancel aria-label="Close">×</button>' +
      '</div>' +
      '<div class="adialog__body">' +
        '<h2 class="adialog__title" id="confirmTitle">Are you sure?</h2>' +
        '<p class="adialog__sub" id="confirmMessage"></p>' +
      '</div>' +
      '<div class="adialog__foot">' +
        '<button class="abtn" type="button" data-confirm-cancel>Cancel</button>' +
        '<button class="abtn abtn--danger" type="button" data-confirm-accept>Delete</button>' +
      '</div>';
    document.body.appendChild(confirmDialog);
    confirmDialog.querySelectorAll('[data-confirm-cancel]').forEach(function (button) {
      button.addEventListener('click', function () {
        confirmDialog.returnValue = 'cancel';
        confirmDialog.close();
      });
    });
    confirmDialog.querySelector('[data-confirm-accept]').addEventListener('click', function () {
      confirmDialog.returnValue = 'confirm';
      confirmDialog.close();
    });
    confirmDialog.addEventListener('click', function (event) {
      if (event.target === confirmDialog) {
        confirmDialog.returnValue = 'cancel';
        confirmDialog.close();
      }
    });
    return confirmDialog;
  }

  function confirmAction(options) {
    var dialog = ensureConfirmDialog();
    dialog.querySelector('#confirmTitle').textContent = options.title || 'Are you sure?';
    dialog.querySelector('#confirmMessage').textContent = options.message || '';
    var accept = dialog.querySelector('[data-confirm-accept]');
    accept.textContent = options.confirmLabel || 'Delete';
    accept.className = 'abtn ' + (options.tone === 'primary' ? 'abtn--primary' : 'abtn--danger');
    dialog.returnValue = '';
    dialog.showModal();
    return new Promise(function (resolve) {
      dialog.addEventListener('close', function onClose() {
        dialog.removeEventListener('close', onClose);
        resolve(dialog.returnValue === 'confirm');
      }, { once: true });
    });
  }

  function buildNav() {
    var nav = qs('#adminNav');
    if (!nav) return;
    var page = document.body.getAttribute('data-page') || 'overview';
    navItems.forEach(function (item) {
      var link = document.createElement('a');
      link.href = item.href;
      link.innerHTML = svg(item.icon) + '<span>' + item.label + '</span>';
      if (item.page === page) {
        link.classList.add('is-active');
        link.setAttribute('aria-current', 'page');
      }
      nav.appendChild(link);
    });
  }

  function closeMenu() {
    var sidebar = qs('#adminSidebar');
    var overlay = qs('#adminOverlay');
    var toggle = qs('#adminMenuToggle');
    if (sidebar) sidebar.classList.remove('is-open');
    if (overlay) overlay.hidden = true;
    if (toggle) toggle.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('admin-menu-open');
  }

  function openMenu() {
    var sidebar = qs('#adminSidebar');
    var overlay = qs('#adminOverlay');
    var toggle = qs('#adminMenuToggle');
    if (sidebar) sidebar.classList.add('is-open');
    if (overlay) overlay.hidden = false;
    if (toggle) toggle.setAttribute('aria-expanded', 'true');
    document.body.classList.add('admin-menu-open');
    var first = qs('a', sidebar);
    if (first) first.focus({ preventScroll: true });
  }

  function initChrome() {
    buildNav();
    var toggle = qs('#adminMenuToggle');
    var overlay = qs('#adminOverlay');
    if (toggle) {
      toggle.addEventListener('click', function () {
        var open = qs('#adminSidebar').classList.contains('is-open');
        if (open) closeMenu();
        else openMenu();
      });
    }
    if (overlay) overlay.addEventListener('click', closeMenu);
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && qs('#adminSidebar') && qs('#adminSidebar').classList.contains('is-open')) closeMenu();
    });
    var desktop = window.matchMedia('(min-width: 64em)');
    if (desktop.addEventListener) desktop.addEventListener('change', function (event) { if (event.matches) closeMenu(); });

    qsa('[data-logout]').forEach(function (logout) {
      logout.addEventListener('click', async function () {
        logout.disabled = true;
        try {
          await api('/api/admin/logout', { method: 'POST' });
        } catch (error) {
          /* A missing session still means the user is signed out. */
        }
        window.location.assign('/admin/login');
      });
    });

    api('/api/admin/me').then(function (data) {
      var email = data.admin && data.admin.email || 'Admin';
      qsa('[data-admin-email]').forEach(function (node) { node.textContent = email; });
      qsa('[data-admin-initials]').forEach(function (node) { node.textContent = initials(email); });
    }).catch(function (error) {
      if (error.status && error.status !== 401) console.error(error);
    });
  }

  window.Admin = {
    api: api,
    qs: qs,
    qsa: qsa,
    toast: toast,
    confirm: confirmAction,
    formatDate: formatDate,
    formatDateTime: formatDateTime,
    formatCurrency: formatCurrency,
    statusBadge: statusBadge,
    statusSlug: statusSlug,
    makeElement: makeElement,
    closeMenu: closeMenu
  };

  initChrome();
})();
