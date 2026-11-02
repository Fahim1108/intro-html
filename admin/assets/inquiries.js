(function () {
  'use strict';

  var body = document.getElementById('inquiryBody');
  var resultsCount = document.getElementById('resultsCount');
  var resultsRange = document.getElementById('resultsRange');
  var pageLabel = document.getElementById('pageLabel');
  var prevPage = document.getElementById('prevPage');
  var nextPage = document.getElementById('nextPage');
  var searchInput = document.getElementById('inquirySearch');
  var statusFilter = document.getElementById('statusFilter');
  var typeFilter = document.getElementById('typeFilter');
  var sortFilter = document.getElementById('sortFilter');
  var clearFilters = document.getElementById('clearFilters');
  var dialog = document.getElementById('inquiryDialog');
  var detailName = document.getElementById('detailName');
  var detailReference = document.getElementById('detailReference');
  var detailReceived = document.getElementById('detailReceived');
  var detailMeta = document.getElementById('detailMeta');
  var detailGrid = document.getElementById('detailGrid');
  var detailDescription = document.getElementById('detailDescription');
  var detailStatus = document.getElementById('detailStatus');
  var detailStatusError = document.getElementById('detailStatusError');
  var saveStatus = document.getElementById('saveStatus');
  var replyEmail = document.getElementById('replyEmail');
  var callPhone = document.getElementById('callPhone');
  var detailClose = document.getElementById('detailClose');
  var detailDone = document.getElementById('detailDone');
  var currentInquiry = null;
  var requestNumber = 0;
  var state = { search: '', status: '', type: '', sort: 'newest', page: 1, limit: 20 };
  var meta = { total: 0, pages: 1 };

  function debounce(fn, delay) {
    var timer;
    return function () {
      var args = arguments;
      window.clearTimeout(timer);
      timer = window.setTimeout(function () { fn.apply(null, args); }, delay);
    };
  }

  function setLoading() {
    body.replaceChildren();
    var row = document.createElement('tr');
    var cell = document.createElement('td');
    cell.colSpan = 6;
    var loading = Admin.makeElement('div', 'loading-state');
    var spinner = Admin.makeElement('span', 'spinner');
    spinner.setAttribute('aria-hidden', 'true');
    loading.appendChild(spinner);
    loading.appendChild(document.createTextNode(' Loading inquiries'));
    cell.appendChild(loading);
    row.appendChild(cell);
    body.appendChild(row);
    if (resultsCount) resultsCount.textContent = 'Loading…';
  }

  function emptyState() {
    var row = document.createElement('tr');
    var cell = document.createElement('td');
    cell.colSpan = 6;
    var empty = Admin.makeElement('div', 'empty-state');
    empty.appendChild(Admin.makeElement('span', 'empty-state__mark', '✳'));
    empty.appendChild(Admin.makeElement('h2', '', state.search || state.status || state.type ? 'No matches.' : 'No inquiries yet.'));
    empty.appendChild(Admin.makeElement('p', '', state.search || state.status || state.type
      ? 'Try a different search or clear the filters.'
      : 'New project briefs will appear here as soon as they are submitted.'));
    if (state.search || state.status || state.type) {
      var clear = Admin.makeElement('button', 'abtn abtn--sm', 'Clear filters');
      clear.type = 'button';
      clear.addEventListener('click', resetFilters);
      empty.appendChild(clear);
    }
    cell.appendChild(empty);
    row.appendChild(cell);
    return row;
  }

  function renderRows(items) {
    body.replaceChildren();
    if (!items.length) {
      body.appendChild(emptyState());
      return;
    }

    items.forEach(function (inquiry) {
      var row = document.createElement('tr');

      var nameCell = document.createElement('td');
      nameCell.setAttribute('data-label', 'Name');
      var nameButton = Admin.makeElement('button', 'row-name row-name--button', inquiry.full_name);
      nameButton.type = 'button';
      nameButton.addEventListener('click', function () { openInquiry(inquiry.id); });
      nameCell.appendChild(nameButton);
      nameCell.appendChild(Admin.makeElement('p', 'row-meta', inquiry.email));

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

      var actionCell = document.createElement('td');
      actionCell.setAttribute('data-label', 'Actions');
      var view = Admin.makeElement('button', 'abtn abtn--sm', 'View');
      view.type = 'button';
      view.addEventListener('click', function () { openInquiry(inquiry.id); });
      actionCell.appendChild(view);

      row.appendChild(nameCell);
      row.appendChild(typeCell);
      row.appendChild(budgetCell);
      row.appendChild(statusCell);
      row.appendChild(dateCell);
      row.appendChild(actionCell);
      body.appendChild(row);
    });
  }

  function renderMeta() {
    if (resultsCount) resultsCount.textContent = meta.total + (meta.total === 1 ? ' inquiry' : ' inquiries');
    if (resultsRange) {
      if (!meta.total) resultsRange.textContent = 'No results';
      else {
        var start = (state.page - 1) * state.limit + 1;
        var end = Math.min(state.page * state.limit, meta.total);
        resultsRange.textContent = start + '–' + end + ' of ' + meta.total;
      }
    }
    if (pageLabel) pageLabel.textContent = 'Page ' + state.page + ' of ' + meta.pages;
    if (prevPage) prevPage.disabled = state.page <= 1;
    if (nextPage) nextPage.disabled = state.page >= meta.pages;
  }

  function showError(error) {
    body.replaceChildren();
    var row = document.createElement('tr');
    var cell = document.createElement('td');
    cell.colSpan = 6;
    var stateBox = Admin.makeElement('div', 'error-state');
    stateBox.textContent = error.message || 'Could not load inquiries.';
    var retry = Admin.makeElement('button', 'abtn abtn--sm', 'Try again');
    retry.type = 'button';
    retry.addEventListener('click', load);
    stateBox.appendChild(document.createElement('br'));
    stateBox.appendChild(retry);
    cell.appendChild(stateBox);
    row.appendChild(cell);
    body.appendChild(row);
  }

  async function load() {
    if (!body) return;
    var currentRequest = ++requestNumber;
    setLoading();
    var params = new URLSearchParams();
    if (state.search) params.set('search', state.search);
    if (state.status) params.set('status', state.status);
    if (state.type) params.set('type', state.type);
    params.set('sort', state.sort);
    params.set('page', String(state.page));
    params.set('limit', String(state.limit));

    try {
      var data = await Admin.api('/api/admin/inquiries?' + params.toString());
      if (currentRequest !== requestNumber) return;
      if (state.page > data.pages && data.pages > 0) {
        state.page = data.pages;
        return load();
      }
      meta = { total: data.total, pages: data.pages };
      renderRows(data.items || []);
      renderMeta();
    } catch (error) {
      if (currentRequest !== requestNumber) return;
      showError(error);
      if (resultsCount) resultsCount.textContent = 'Unavailable';
    }
  }

  function detailItem(label, value, isLink) {
    var wrapper = document.createElement('div');
    wrapper.className = 'detail-item';
    var dt = document.createElement('dt');
    dt.textContent = label;
    var dd = document.createElement('dd');
    if (isLink) dd.appendChild(isLink);
    else dd.textContent = value || '—';
    wrapper.appendChild(dt);
    wrapper.appendChild(dd);
    return wrapper;
  }

  function renderDetail(inquiry) {
    currentInquiry = inquiry;
    detailName.textContent = inquiry.full_name;
    detailReference.textContent = inquiry.reference;
    detailReceived.textContent = 'Received ' + Admin.formatDateTime(inquiry.created_at);
    detailMeta.textContent = inquiry.website_type + ' · ' + inquiry.budget_range;
    detailDescription.textContent = inquiry.description;
    detailStatus.value = inquiry.status;
    detailStatusError.textContent = '';

    var email = document.createElement('a');
    email.href = 'mailto:' + inquiry.email;
    email.textContent = inquiry.email;

    var phone = document.createElement('a');
    phone.href = 'tel:' + String(inquiry.phone || '').replace(/[^\d+]/g, '');
    phone.textContent = inquiry.phone;

    detailGrid.replaceChildren(
      detailItem('Email', inquiry.email, email),
      detailItem('Phone / WhatsApp', inquiry.phone, phone),
      detailItem('Business name', inquiry.business_name || '—'),
      detailItem('Website type', inquiry.website_type),
      detailItem('Budget range', inquiry.budget_range),
      detailItem('Last updated', Admin.formatDateTime(inquiry.updated_at))
    );

    replyEmail.href = 'mailto:' + inquiry.email + '?subject=' + encodeURIComponent('Your NeedYourSite project inquiry · ' + inquiry.reference);
    callPhone.href = phone.href;

    if (!dialog.open) dialog.showModal();
  }

  async function openInquiry(id) {
    try {
      var data = await Admin.api('/api/admin/inquiries/' + encodeURIComponent(id));
      renderDetail(data.inquiry);
    } catch (error) {
      Admin.toast(error.message || 'Could not open the inquiry.', 'error');
    }
  }

  async function saveCurrentStatus() {
    if (!currentInquiry) return;
    saveStatus.disabled = true;
    saveStatus.setAttribute('aria-busy', 'true');
    saveStatus.textContent = 'Saving…';
    detailStatusError.textContent = '';
    try {
      var data = await Admin.api('/api/admin/inquiries/' + currentInquiry.id + '/status', {
        method: 'PATCH',
        body: { status: detailStatus.value }
      });
      currentInquiry = data.inquiry;
      Admin.toast('Inquiry status updated.');
      await load();
    } catch (error) {
      detailStatusError.textContent = error.message || 'Could not update the status.';
      if (error.fields && error.fields.status) detailStatusError.textContent = error.fields.status;
    } finally {
      saveStatus.disabled = false;
      saveStatus.removeAttribute('aria-busy');
      saveStatus.textContent = 'Save status';
    }
  }

  function resetFilters() {
    state.search = '';
    state.status = '';
    state.type = '';
    state.sort = 'newest';
    state.page = 1;
    if (searchInput) searchInput.value = '';
    if (statusFilter) statusFilter.value = '';
    if (typeFilter) typeFilter.value = '';
    if (sortFilter) sortFilter.value = 'newest';
    load();
  }

  if (searchInput) searchInput.addEventListener('input', debounce(function () {
    state.search = searchInput.value.trim();
    state.page = 1;
    load();
  }, 280));

  [statusFilter, typeFilter, sortFilter].forEach(function (select) {
    if (!select) return;
    select.addEventListener('change', function () {
      state.status = statusFilter.value;
      state.type = typeFilter.value;
      state.sort = sortFilter.value;
      state.page = 1;
      load();
    });
  });

  if (clearFilters) clearFilters.addEventListener('click', resetFilters);
  if (prevPage) prevPage.addEventListener('click', function () {
    if (state.page > 1) { state.page -= 1; load(); }
  });
  if (nextPage) nextPage.addEventListener('click', function () {
    if (state.page < meta.pages) { state.page += 1; load(); }
  });
  if (saveStatus) saveStatus.addEventListener('click', saveCurrentStatus);

  if (detailClose) detailClose.addEventListener('click', function () { dialog.close(); });
  if (detailDone) detailDone.addEventListener('click', function () { dialog.close(); });
  if (dialog) {
    dialog.addEventListener('click', function (event) {
      if (event.target === dialog) dialog.close();
    });
  }

  var openId = new URLSearchParams(window.location.search).get('open');
  load().then(function () {
    if (openId) openInquiry(openId);
  });
})();
