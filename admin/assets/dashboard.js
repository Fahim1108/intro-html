(function () {
  'use strict';

  var body = document.getElementById('recentBody');
  var grid = document.getElementById('statsGrid');

  function setStat(name, value) {
    var node = document.querySelector('[data-stat="' + name + '"]');
    if (node) node.textContent = String(value);
  }

  function emptyRow(message) {
    var row = document.createElement('tr');
    var cell = document.createElement('td');
    cell.colSpan = 5;
    var empty = Admin.makeElement('div', 'empty-state');
    var mark = Admin.makeElement('span', 'empty-state__mark', '✳');
    var heading = Admin.makeElement('h2', '', message);
    var copy = Admin.makeElement('p', '', 'When a new project brief arrives, it will appear here.');
    empty.appendChild(mark);
    empty.appendChild(heading);
    empty.appendChild(copy);
    cell.appendChild(empty);
    row.appendChild(cell);
    return row;
  }

  function renderRecent(items) {
    body.replaceChildren();
    if (!items.length) {
      body.appendChild(emptyRow('No inquiries yet.'));
      return;
    }
    items.forEach(function (inquiry) {
      var row = document.createElement('tr');

      var nameCell = document.createElement('td');
      nameCell.setAttribute('data-label', 'Name');
      var link = document.createElement('a');
      link.className = 'row-name';
      link.href = '/admin/inquiries?open=' + encodeURIComponent(inquiry.id);
      link.textContent = inquiry.full_name;
      var meta = Admin.makeElement('p', 'row-meta', inquiry.email);
      nameCell.appendChild(link);
      nameCell.appendChild(meta);

      var typeCell = document.createElement('td');
      typeCell.setAttribute('data-label', 'Website type');
      typeCell.textContent = inquiry.website_type;

      var budgetCell = document.createElement('td');
      budgetCell.setAttribute('data-label', 'Budget');
      budgetCell.textContent = inquiry.budget_range;

      var statusCell = document.createElement('td');
      statusCell.setAttribute('data-label', 'Status');
      statusCell.appendChild(Admin.statusBadge(inquiry.status));

      var dateCell = document.createElement('td');
      dateCell.setAttribute('data-label', 'Date');
      dateCell.textContent = Admin.formatDate(inquiry.created_at);

      row.appendChild(nameCell);
      row.appendChild(typeCell);
      row.appendChild(budgetCell);
      row.appendChild(statusCell);
      row.appendChild(dateCell);
      body.appendChild(row);
    });
  }

  function showError(error) {
    body.replaceChildren();
    var row = document.createElement('tr');
    var cell = document.createElement('td');
    cell.colSpan = 5;
    var state = Admin.makeElement('div', 'error-state');
    state.textContent = error.message || 'Could not load the dashboard.';
    var retry = Admin.makeElement('button', 'abtn abtn--sm', 'Try again');
    retry.type = 'button';
    retry.addEventListener('click', load);
    state.appendChild(document.createElement('br'));
    state.appendChild(retry);
    cell.appendChild(state);
    row.appendChild(cell);
    body.appendChild(row);
    if (grid) grid.setAttribute('aria-busy', 'false');
  }

  async function load() {
    if (!body) return;
    body.replaceChildren();
    var loading = document.createElement('tr');
    var cell = document.createElement('td');
    cell.colSpan = 5;
    var state = Admin.makeElement('div', 'loading-state');
    var spinner = Admin.makeElement('span', 'spinner');
    spinner.setAttribute('aria-hidden', 'true');
    state.appendChild(spinner);
    state.appendChild(document.createTextNode(' Loading inquiries'));
    cell.appendChild(state);
    loading.appendChild(cell);
    body.appendChild(loading);
    if (grid) grid.setAttribute('aria-busy', 'true');

    try {
      var data = await Admin.api('/api/admin/stats');
      var stats = data.stats || {};
      setStat('total', stats.total || 0);
      setStat('new', stats.new || 0);
      setStat('contacted', stats.contacted || 0);
      setStat('confirmed', stats.confirmed || 0);
      if (grid) grid.setAttribute('aria-busy', 'false');
      renderRecent(data.recent || []);
    } catch (error) {
      showError(error);
    }
  }

  load();
})();
