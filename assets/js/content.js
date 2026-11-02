/* NeedYourSite — database-backed public content.
   The static HTML is the fallback; this only updates the managed fields. */
(function () {
  'use strict';

  var money = new Intl.NumberFormat('en-US');

  function pad(number) {
    return number < 10 ? '0' + number : String(number);
  }

  function setTitle(element, name) {
    if (!element) return;
    var words = String(name || '').trim().split(/\s+/).filter(Boolean);
    element.replaceChildren();
    if (words.length < 2) {
      element.textContent = name || '';
      return;
    }

    var splitAt = words.length - 1;
    if (words.length > 2 && /^(&|and)$/i.test(words[words.length - 2])) splitAt = words.length - 2;
    element.appendChild(document.createTextNode(words.slice(0, splitAt).join(' ') + ' '));
    var emphasis = document.createElement('em');
    emphasis.textContent = words.slice(splitAt).join(' ');
    element.appendChild(emphasis);
  }

  function makeMeta(number, category) {
    var fragment = document.createDocumentFragment();
    var numberSpan = document.createElement('span');
    numberSpan.textContent = number;
    fragment.appendChild(numberSpan);
    fragment.appendChild(document.createTextNode(' ' + (category || '')));
    return fragment;
  }

  function addCover(mock, project) {
    if (!mock) return;
    mock.replaceChildren();
    mock.classList.add('project__mock--cover');
    mock.classList.remove('project__mock--empty');
    mock.removeAttribute('aria-hidden');

    var image = document.createElement('img');
    image.src = project.cover_image;
    image.alt = project.name + ' project cover';
    image.loading = 'lazy';
    image.decoding = 'async';
    var cover = document.createElement('div');
    cover.className = 'project__cover';
    cover.appendChild(image);
    mock.appendChild(cover);
  }

  function addEmptyCover(mock, project) {
    if (!mock) return;
    mock.replaceChildren();
    mock.classList.remove('project__mock--cover');
    mock.classList.add('project__mock--empty');
    mock.removeAttribute('aria-hidden');

    var empty = document.createElement('div');
    empty.className = 'project__cover-placeholder';
    var star = document.createElement('span');
    star.className = 'project__cover-star';
    star.textContent = '✳';
    var label = document.createElement('span');
    label.textContent = project.category || 'Selected work';
    var name = document.createElement('b');
    name.textContent = project.name || '';
    empty.appendChild(star);
    empty.appendChild(label);
    empty.appendChild(name);
    mock.appendChild(empty);
  }

  function setProjectFacts(facts, project) {
    if (!facts) return;
    facts.replaceChildren();
    if (project.category) {
      var category = document.createElement('div');
      var dt = document.createElement('dt');
      dt.textContent = 'Category';
      var dd = document.createElement('dd');
      dd.textContent = project.category;
      category.appendChild(dt);
      category.appendChild(dd);
      facts.appendChild(category);
    }
    if (project.services) {
      var services = document.createElement('div');
      var sdt = document.createElement('dt');
      sdt.textContent = 'Services';
      var sdd = document.createElement('dd');
      sdd.textContent = project.services;
      services.appendChild(sdt);
      services.appendChild(sdd);
      facts.appendChild(services);
    }
  }

  function hydrateProjects(items) {
    var grid = document.querySelector('.projects');
    var template = document.getElementById('projectTemplate');
    if (!grid || !template || !Array.isArray(items)) return;

    var existing = new Map();
    Array.prototype.forEach.call(grid.querySelectorAll('.project'), function (card) {
      var slug = card.getAttribute('data-project-slug');
      if (slug) existing.set(slug, card);
    });

    var used = new Set();
    var articles = items.map(function (project) {
      var card = existing.get(project.slug) || null;
      var isNew = !card;
      if (isNew) {
        card = template.content.firstElementChild.cloneNode(true);
        card.classList.add('is-in');
      }

      used.add(project.slug);
      card.setAttribute('data-project-slug', project.slug);
      card.setAttribute('data-project-id', String(project.id));
      card.setAttribute('data-project-url', project.project_url || '');

      var title = card.querySelector('.project__title');
      setTitle(title, project.name);

      var desc = card.querySelector('.project__desc');
      if (desc) desc.textContent = project.description || '';

      var tags = card.querySelector('.project__tags');
      if (tags) tags.textContent = project.services || '';

      var mock = card.querySelector('.project__mock');
      if (project.cover_image) {
        addCover(mock, project);
      } else if (isNew) {
        addEmptyCover(mock, project);
      }

      if (isNew) {
        setProjectFacts(card.querySelector('.project__facts'), project);
        var trigger = card.querySelector('[data-project-open]');
        if (trigger) trigger.setAttribute('aria-label', 'View the ' + project.name + ' project');
      }

      var meta = card.querySelector('.project__meta');
      if (meta) {
        var number = meta.querySelector('span');
        if (number) {
          meta.replaceChildren(makeMeta(number.textContent, project.category));
        }
      }

      grid.appendChild(card);
      return card;
    });

    Array.prototype.forEach.call(grid.querySelectorAll('.project'), function (card) {
      if (!used.has(card.getAttribute('data-project-slug'))) card.remove();
    });

    articles.forEach(function (card, index) {
      var number = pad(index + 1);
      var bigNumber = card.querySelector('.project__number');
      if (bigNumber) bigNumber.textContent = number;
      var meta = card.querySelector('.project__meta');
      if (meta) {
        var category = items[index].category || '';
        meta.replaceChildren(makeMeta(number, category));
      }
    });

    var note = document.querySelector('.work .section-head__note');
    if (note) {
      var count = items.length;
      note.textContent = count === 3
        ? 'Three projects. Three different problems.'
        : count === 1
          ? 'One project. One different problem.'
          : count > 1
            ? count + ' projects. Different problems.'
            : 'New work is on its way.';
    }

    var empty = grid.querySelector('.projects__empty');
    if (!items.length && !empty) {
      var message = document.createElement('p');
      message.className = 'projects__empty';
      message.textContent = 'New work is on its way.';
      grid.appendChild(message);
    } else if (items.length && empty) {
      empty.remove();
    }
  }

  function hydrateServices(items) {
    var grid = document.querySelector('.build-grid');
    var template = document.getElementById('serviceTemplate');
    if (!grid || !template || !Array.isArray(items)) return;

    var existing = new Map();
    Array.prototype.forEach.call(grid.querySelectorAll('[data-service-slug]'), function (tile) {
      existing.set(tile.getAttribute('data-service-slug'), tile);
    });

    var used = new Set();
    var tiles = items.map(function (service) {
      var tile = existing.get(service.slug) || null;
      var isNew = !tile;
      if (isNew) {
        tile = template.content.firstElementChild.cloneNode(true);
        tile.classList.add('is-in');
      }

      used.add(service.slug);
      tile.setAttribute('data-service-slug', service.slug);
      tile.setAttribute('data-service-id', String(service.id));
      tile.setAttribute('href', '/start?type=' + encodeURIComponent(service.website_type || 'Custom Website'));
      tile.setAttribute('aria-label', service.name + ' website from ৳' + money.format(service.starting_price));
      if (service.description) tile.setAttribute('title', service.description);

      var heading = tile.querySelector('.tile__info h3');
      if (heading) heading.textContent = service.name;
      var price = tile.querySelector('.tile__info p');
      if (price) price.textContent = 'From ৳' + money.format(service.starting_price);

      var miniWord = tile.querySelector('.mini__word');
      if (isNew && miniWord) {
        miniWord.replaceChildren();
        miniWord.appendChild(document.createTextNode('Built for '));
        var emphasis = document.createElement('em');
        emphasis.textContent = service.name;
        miniWord.appendChild(emphasis);
        miniWord.appendChild(document.createTextNode('.'));
      }

      grid.appendChild(tile);
      return tile;
    });

    Array.prototype.forEach.call(grid.querySelectorAll('[data-service-slug]'), function (tile) {
      if (!used.has(tile.getAttribute('data-service-slug'))) tile.remove();
    });

    tiles.forEach(function (tile, index) {
      var number = tile.querySelector('.tile__num');
      if (number) number.textContent = pad(index + 1);
    });

    var note = document.querySelector('.services .section-head__note');
    if (note) {
      note.textContent = items.length === 8
        ? 'Eight starting points. One studio. No themes.'
        : items.length + (items.length === 1 ? ' starting point. One studio. No themes.' : ' starting points. One studio. No themes.');
    }

    var empty = grid.querySelector('.services__empty');
    if (!items.length && !empty) {
      var message = document.createElement('p');
      message.className = 'services__empty';
      message.textContent = 'Service details are being updated. Email hello@needyoursite.com in the meantime.';
      grid.appendChild(message);
    } else if (items.length && empty) {
      empty.remove();
    }
  }

  function exposePreviewAdmin() {
    var host = window.location.hostname;
    var isPreview = host === 'localhost' || host === '127.0.0.1' || host === 'style.dev' || /\.style\.dev$/i.test(host);
    if (!isPreview) return;

    var bottom = document.querySelector('.footer__bottom');
    if (!bottom) return;

    var link = document.createElement('a');
    link.href = '/admin/login';
    link.textContent = 'Admin preview';
    link.setAttribute('data-preview-admin', '');
    bottom.appendChild(link);
  }

  function load() {
    fetch('/api/projects', { headers: { Accept: 'application/json' }, credentials: 'same-origin' })
      .then(function (response) { return response.ok ? response.json() : Promise.reject(new Error('projects')); })
      .then(function (data) { hydrateProjects(data.projects); })
      .catch(function () { /* The static portfolio remains the fallback. */ });

    fetch('/api/services', { headers: { Accept: 'application/json' }, credentials: 'same-origin' })
      .then(function (response) { return response.ok ? response.json() : Promise.reject(new Error('services')); })
      .then(function (data) { hydrateServices(data.services); })
      .catch(function () { /* The static services remain the fallback. */ });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', load, { once: true });
  } else {
    load();
  }

  exposePreviewAdmin();
})();
