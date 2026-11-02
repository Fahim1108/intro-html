(function () {
  'use strict';

  var list = document.getElementById('servicesList');
  var count = document.getElementById('servicesCount');
  var addButton = document.getElementById('addService');
  var dialog = document.getElementById('serviceDialog');
  var form = document.getElementById('serviceForm');
  var formError = document.getElementById('serviceFormError');
  var serviceId = document.getElementById('serviceId');
  var websiteType = document.getElementById('serviceWebsiteType');
  var nameInput = document.getElementById('serviceName');
  var priceInput = document.getElementById('servicePrice');
  var orderInput = document.getElementById('serviceOrder');
  var descriptionInput = document.getElementById('serviceDescription');
  var saveButton = document.getElementById('saveService');
  var dialogTitle = document.getElementById('serviceDialogTitle');
  var dialogLabel = document.getElementById('serviceDialogLabel');
  var services = [];
  var editing = null;

  function clearErrors() {
    ['serviceName', 'servicePrice', 'serviceOrder', 'serviceDescription'].forEach(function (id) {
      var node = document.getElementById(id + 'Error');
      if (node) node.textContent = '';
    });
    if (formError) {
      formError.hidden = true;
      formError.textContent = '';
    }
  }

  function setErrors(fields) {
    var map = {
      name: 'serviceName',
      startingPrice: 'servicePrice',
      displayOrder: 'serviceOrder',
      description: 'serviceDescription'
    };
    Object.keys(fields || {}).forEach(function (key) {
      var node = document.getElementById((map[key] || ('service' + key)) + 'Error');
      if (node) node.textContent = fields[key];
    });
  }

  function openForm(service) {
    editing = service || null;
    if (form) form.reset();
    clearErrors();
    if (serviceId) serviceId.value = service ? String(service.id) : '';
    if (websiteType) websiteType.value = service ? service.website_type : '';
    if (nameInput) nameInput.value = service ? service.name : '';
    if (priceInput) priceInput.value = service ? String(service.starting_price) : '';
    if (orderInput) orderInput.value = service ? String(service.display_order) : '';
    if (descriptionInput) descriptionInput.value = service ? service.description : '';
    if (dialogTitle) dialogTitle.textContent = service ? 'Edit service' : 'New service';
    if (dialogLabel) dialogLabel.textContent = service ? 'Edit the offering' : 'Add to the offering';
    if (saveButton) {
      saveButton.disabled = false;
      saveButton.removeAttribute('aria-busy');
      saveButton.innerHTML = service ? 'Save changes <span aria-hidden="true">↗</span>' : 'Save service <span aria-hidden="true">↗</span>';
    }
    if (!dialog.open) dialog.showModal();
    window.setTimeout(function () { if (nameInput) nameInput.focus({ preventScroll: true }); }, 40);
  }

  function closeForm() {
    if (dialog.open) dialog.close();
  }

  function serviceRow(service) {
    var row = Admin.makeElement('div', 'service-row');
    var order = Admin.makeElement('div', 'service-order');
    order.appendChild(Admin.makeElement('span', '', String(service.display_order).padStart(2, '0')));
    row.appendChild(order);

    var body = Admin.makeElement('div', '');
    body.appendChild(Admin.makeElement('p', 'service-name', service.name));
    if (service.description) body.appendChild(Admin.makeElement('p', 'service-desc', service.description));
    body.appendChild(Admin.makeElement('p', 'service-price', 'From ' + Admin.formatCurrency(service.starting_price)));
    row.appendChild(body);

    var actions = Admin.makeElement('div', 'service-actions');
    var edit = Admin.makeElement('button', 'abtn abtn--sm', 'Edit');
    edit.type = 'button';
    edit.addEventListener('click', function () { openForm(service); });
    var remove = Admin.makeElement('button', 'abtn abtn--sm abtn--danger', 'Delete');
    remove.type = 'button';
    remove.setAttribute('aria-label', 'Delete ' + service.name);
    remove.addEventListener('click', function () { deleteService(service, remove); });
    actions.appendChild(edit);
    actions.appendChild(remove);
    row.appendChild(actions);
    return row;
  }

  function render() {
    if (!list) return;
    list.replaceChildren();
    if (count) count.textContent = services.length + (services.length === 1 ? ' service' : ' services');
    if (!services.length) {
      var empty = Admin.makeElement('div', 'empty-state');
      empty.appendChild(Admin.makeElement('span', 'empty-state__mark', '✳'));
      empty.appendChild(Admin.makeElement('h2', '', 'No services listed.'));
      empty.appendChild(Admin.makeElement('p', '', 'Add a starting point so the public services section has something to show.'));
      var add = Admin.makeElement('button', 'abtn abtn--primary', 'Add a service');
      add.type = 'button';
      add.addEventListener('click', function () { openForm(null); });
      empty.appendChild(add);
      list.appendChild(empty);
      return;
    }
    services.forEach(function (service) { list.appendChild(serviceRow(service)); });
  }

  function showError(error) {
    list.replaceChildren();
    var state = Admin.makeElement('div', 'error-state');
    state.textContent = error.message || 'Could not load services.';
    var retry = Admin.makeElement('button', 'abtn abtn--sm', 'Try again');
    retry.type = 'button';
    retry.addEventListener('click', load);
    state.appendChild(document.createElement('br'));
    state.appendChild(retry);
    list.appendChild(state);
    if (count) count.textContent = 'Unavailable';
  }

  async function load() {
    if (!list) return;
    list.replaceChildren();
    var loading = Admin.makeElement('div', 'loading-state');
    var spinner = Admin.makeElement('span', 'spinner');
    spinner.setAttribute('aria-hidden', 'true');
    loading.appendChild(spinner);
    loading.appendChild(document.createTextNode(' Loading services'));
    list.appendChild(loading);
    if (count) count.textContent = 'Loading…';
    try {
      var data = await Admin.api('/api/admin/services');
      services = data.services || [];
      render();
    } catch (error) {
      showError(error);
    }
  }

  async function deleteService(service, button) {
    var confirmed = await Admin.confirm({
      title: 'Remove “' + service.name + '”?',
      message: 'This removes the service from the public starting points. Existing inquiries are unaffected. This cannot be undone.',
      confirmLabel: 'Remove service',
      tone: 'danger'
    });
    if (!confirmed) return;
    button.disabled = true;
    try {
      await Admin.api('/api/admin/services/' + service.id, { method: 'DELETE' });
      Admin.toast('Service removed.');
      await load();
    } catch (error) {
      Admin.toast(error.message || 'Could not remove the service.', 'error');
      button.disabled = false;
    }
  }

  if (addButton) addButton.addEventListener('click', function () { openForm(null); });
  if (dialog) {
    dialog.addEventListener('click', function (event) { if (event.target === dialog) closeForm(); });
  }
  Admin.qsa('[data-service-cancel]', document).forEach(function (button) {
    button.addEventListener('click', closeForm);
  });

  if (form) {
    form.addEventListener('input', function (event) {
      if (!event.target.name) return;
      var map = { name: 'serviceName', startingPrice: 'servicePrice', displayOrder: 'serviceOrder', description: 'serviceDescription' };
      var node = document.getElementById((map[event.target.name] || '') + 'Error');
      if (node) node.textContent = '';
      if (formError) formError.hidden = true;
    });

    form.addEventListener('submit', async function (event) {
      event.preventDefault();
      clearErrors();
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      var payload = {
        name: nameInput.value.trim(),
        startingPrice: Number(priceInput.value),
        description: descriptionInput.value.trim(),
        displayOrder: orderInput.value === '' ? undefined : Number(orderInput.value)
      };
      if (websiteType && websiteType.value) payload.websiteType = websiteType.value;

      saveButton.disabled = true;
      saveButton.setAttribute('aria-busy', 'true');
      saveButton.textContent = 'Saving…';
      try {
        var isEditing = Boolean(serviceId.value);
        await Admin.api(isEditing ? '/api/admin/services/' + serviceId.value : '/api/admin/services', {
          method: isEditing ? 'PATCH' : 'POST',
          body: payload
        });
        closeForm();
        Admin.toast(isEditing ? 'Service updated.' : 'Service added.');
        await load();
      } catch (error) {
        setErrors(error.fields);
        if (formError) {
          formError.textContent = error.message || 'Could not save the service.';
          formError.hidden = false;
        }
        saveButton.disabled = false;
        saveButton.removeAttribute('aria-busy');
        saveButton.innerHTML = serviceId.value ? 'Save changes <span aria-hidden="true">↗</span>' : 'Save service <span aria-hidden="true">↗</span>';
      }
    });
  }

  load();
})();
