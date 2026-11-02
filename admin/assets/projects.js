(function () {
  'use strict';

  var grid = document.getElementById('projectsGrid');
  var count = document.getElementById('projectsCount');
  var addButton = document.getElementById('addProject');
  var dialog = document.getElementById('projectDialog');
  var form = document.getElementById('projectForm');
  var formError = document.getElementById('projectFormError');
  var projectId = document.getElementById('projectId');
  var nameInput = document.getElementById('projectName');
  var categoryInput = document.getElementById('projectCategory');
  var descriptionInput = document.getElementById('projectDescription');
  var servicesInput = document.getElementById('projectServices');
  var urlInput = document.getElementById('projectUrl');
  var coverInput = document.getElementById('projectCover');
  var featuredInput = document.getElementById('projectFeatured');
  var removeCoverInput = document.getElementById('removeCover');
  var removeCoverRow = document.getElementById('removeCoverRow');
  var coverPreview = document.getElementById('coverPreview');
  var saveButton = document.getElementById('saveProject');
  var dialogTitle = document.getElementById('projectDialogTitle');
  var dialogLabel = document.getElementById('projectDialogLabel');
  var previewUrl = '';
  var projects = [];
  var editing = null;

  function setError(name, message) {
    var node = document.getElementById(name + 'Error');
    if (node) node.textContent = message;
  }

  function clearErrors() {
    ['projectName', 'projectCategory', 'projectDescription', 'projectServices', 'projectUrl', 'projectCover'].forEach(function (id) {
      var node = document.getElementById(id + 'Error');
      if (node) node.textContent = '';
    });
    if (formError) {
      formError.hidden = true;
      formError.textContent = '';
    }
    Array.prototype.forEach.call(form.querySelectorAll('[aria-invalid="true"]'), function (field) {
      field.removeAttribute('aria-invalid');
    });
  }

  function mapErrors(fields) {
    var map = {
      name: 'projectName',
      category: 'projectCategory',
      description: 'projectDescription',
      services: 'projectServices',
      projectUrl: 'projectUrl',
      cover: 'projectCover'
    };
    Object.keys(fields || {}).forEach(function (key) {
      setError(map[key] || ('project' + key), fields[key]);
    });
  }

  function revokePreview() {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      previewUrl = '';
    }
  }

  function showPreview(src, alt) {
    if (!coverPreview) return;
    coverPreview.replaceChildren();
    if (src) {
      var image = document.createElement('img');
      image.src = src;
      image.alt = alt || 'Project cover preview';
      coverPreview.appendChild(image);
    } else {
      coverPreview.appendChild(Admin.makeElement('span', '', 'No cover selected'));
    }
  }

  function openForm(project) {
    editing = project || null;
    if (form) form.reset();
    clearErrors();
    revokePreview();
    showPreview(project && project.cover_image ? project.cover_image : '', project ? project.name + ' cover' : '');
    if (removeCoverRow) removeCoverRow.hidden = !(project && project.cover_image);
    if (removeCoverInput) removeCoverInput.checked = false;
    if (projectId) projectId.value = project ? String(project.id) : '';
    if (nameInput) nameInput.value = project ? project.name : '';
    if (categoryInput) categoryInput.value = project ? project.category : '';
    if (descriptionInput) descriptionInput.value = project ? project.description : '';
    if (servicesInput) servicesInput.value = project ? project.services : '';
    if (urlInput) urlInput.value = project ? project.project_url : '';
    if (featuredInput) featuredInput.checked = project ? Boolean(project.featured) : true;
    if (dialogLabel) dialogLabel.textContent = project ? 'Edit portfolio project' : 'Add to the portfolio';
    if (dialogTitle) dialogTitle.textContent = project ? 'Edit project' : 'New project';
    if (saveButton) {
      saveButton.disabled = false;
      saveButton.removeAttribute('aria-busy');
      saveButton.innerHTML = project ? 'Save changes <span aria-hidden="true">↗</span>' : 'Save project <span aria-hidden="true">↗</span>';
    }
    if (!dialog.open) dialog.showModal();
    window.setTimeout(function () { if (nameInput) nameInput.focus({ preventScroll: true }); }, 40);
  }

  function closeForm() {
    if (dialog.open) dialog.close();
    revokePreview();
  }

  function projectCard(project) {
    var card = Admin.makeElement('article', 'project-admin-card');
    var media = Admin.makeElement('div', 'project-admin-card__media');
    if (project.cover_image) {
      var image = document.createElement('img');
      image.src = project.cover_image;
      image.alt = project.name + ' cover';
      image.loading = 'lazy';
      media.appendChild(image);
    } else {
      media.appendChild(Admin.makeElement('div', 'project-admin-card__placeholder', '✳'));
    }

    var body = Admin.makeElement('div', 'project-admin-card__body');
    body.appendChild(Admin.makeElement('p', 'project-admin-card__category', project.category));
    body.appendChild(Admin.makeElement('h2', 'project-admin-card__name', project.name));
    var meta = Admin.makeElement('div', 'project-admin-card__meta');
    if (project.featured) meta.appendChild(Admin.makeElement('span', 'badge badge--featured', 'Featured'));
    if (project.services) meta.appendChild(Admin.makeElement('span', 'badge', project.services));
    body.appendChild(meta);

    var actions = Admin.makeElement('div', 'project-admin-card__actions');
    var edit = Admin.makeElement('button', 'abtn abtn--sm', 'Edit');
    edit.type = 'button';
    edit.addEventListener('click', function () { openForm(project); });
    var remove = Admin.makeElement('button', 'abtn abtn--sm abtn--danger', 'Delete');
    remove.type = 'button';
    remove.setAttribute('aria-label', 'Delete ' + project.name);
    remove.addEventListener('click', function () { deleteProject(project, remove); });
    actions.appendChild(edit);
    actions.appendChild(remove);
    body.appendChild(actions);

    card.appendChild(media);
    card.appendChild(body);
    return card;
  }

  function emptyState() {
    var empty = Admin.makeElement('div', 'empty-state');
    empty.appendChild(Admin.makeElement('span', 'empty-state__mark', '✳'));
    empty.appendChild(Admin.makeElement('h2', '', 'No projects published.'));
    empty.appendChild(Admin.makeElement('p', '', 'Add your first project and it will appear on the public work section.'));
    var add = Admin.makeElement('button', 'abtn abtn--primary', 'Add a project');
    add.type = 'button';
    add.addEventListener('click', function () { openForm(null); });
    empty.appendChild(add);
    return empty;
  }

  function render() {
    if (!grid) return;
    grid.replaceChildren();
    grid.className = 'project-admin-grid';
    if (count) count.textContent = projects.length + (projects.length === 1 ? ' project' : ' projects');
    if (!projects.length) {
      grid.appendChild(emptyState());
      return;
    }
    projects.forEach(function (project) { grid.appendChild(projectCard(project)); });
  }

  function showError(error) {
    grid.className = '';
    grid.replaceChildren();
    var state = Admin.makeElement('div', 'error-state');
    state.textContent = error.message || 'Could not load projects.';
    var retry = Admin.makeElement('button', 'abtn abtn--sm', 'Try again');
    retry.type = 'button';
    retry.addEventListener('click', load);
    state.appendChild(document.createElement('br'));
    state.appendChild(retry);
    grid.appendChild(state);
    if (count) count.textContent = 'Unavailable';
  }

  async function load() {
    if (!grid) return;
    grid.className = '';
    grid.replaceChildren();
    var loading = Admin.makeElement('div', 'loading-state');
    var spinner = Admin.makeElement('span', 'spinner');
    spinner.setAttribute('aria-hidden', 'true');
    loading.appendChild(spinner);
    loading.appendChild(document.createTextNode(' Loading projects'));
    grid.appendChild(loading);
    if (count) count.textContent = 'Loading…';
    try {
      var data = await Admin.api('/api/admin/projects');
      projects = data.projects || [];
      render();
    } catch (error) {
      showError(error);
    }
  }

  async function deleteProject(project, button) {
    var confirmed = await Admin.confirm({
      title: 'Delete “' + project.name + '”?',
      message: 'This removes the project from the public portfolio. The cover image will also be deleted. This cannot be undone.',
      confirmLabel: 'Delete project',
      tone: 'danger'
    });
    if (!confirmed) return;
    button.disabled = true;
    try {
      await Admin.api('/api/admin/projects/' + project.id, { method: 'DELETE' });
      Admin.toast('Project deleted.');
      await load();
    } catch (error) {
      Admin.toast(error.message || 'Could not delete the project.', 'error');
      button.disabled = false;
    }
  }

  if (addButton) addButton.addEventListener('click', function () { openForm(null); });
  if (dialog) {
    dialog.addEventListener('click', function (event) { if (event.target === dialog) closeForm(); });
  }
  Admin.qsa('[data-project-cancel]', document).forEach(function (button) {
    button.addEventListener('click', function () { closeForm(); });
  });

  if (coverInput) {
    coverInput.addEventListener('change', function () {
      var file = coverInput.files && coverInput.files[0];
      revokePreview();
      if (file) {
        previewUrl = URL.createObjectURL(file);
        showPreview(previewUrl, 'Selected project cover');
        if (removeCoverInput) removeCoverInput.checked = false;
        if (removeCoverRow) removeCoverRow.hidden = true;
      } else {
        showPreview(editing && editing.cover_image ? editing.cover_image : '', editing ? editing.name + ' cover' : '');
        if (removeCoverRow) removeCoverRow.hidden = !(editing && editing.cover_image);
      }
    });
  }

  if (removeCoverInput) {
    removeCoverInput.addEventListener('change', function () {
      if (removeCoverInput.checked) {
        if (coverInput) coverInput.value = '';
        revokePreview();
        showPreview('', '');
      } else {
        showPreview(editing && editing.cover_image ? editing.cover_image : '', editing ? editing.name + ' cover' : '');
      }
    });
  }

  if (form) {
    form.addEventListener('input', function (event) {
      if (!event.target.name) return;
      var map = { name: 'projectName', category: 'projectCategory', description: 'projectDescription', services: 'projectServices', projectUrl: 'projectUrl', cover: 'projectCover' };
      var node = document.getElementById(map[event.target.name] + 'Error');
      if (node) node.textContent = '';
      if (event.target.hasAttribute('aria-invalid')) event.target.removeAttribute('aria-invalid');
      if (formError) formError.hidden = true;
    });

    form.addEventListener('submit', async function (event) {
      event.preventDefault();
      clearErrors();
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      var data = new FormData(form);
      data.set('featured', featuredInput && featuredInput.checked ? 'true' : 'false');
      if (removeCoverInput && removeCoverInput.checked) data.set('removeCover', 'true');
      else data.set('removeCover', 'false');
      if (!coverInput.value) data.delete('cover');

      saveButton.disabled = true;
      saveButton.setAttribute('aria-busy', 'true');
      saveButton.textContent = 'Saving…';
      try {
        var isEditing = Boolean(projectId.value);
        await Admin.api(isEditing ? '/api/admin/projects/' + projectId.value : '/api/admin/projects', {
          method: isEditing ? 'PATCH' : 'POST',
          body: data
        });
        closeForm();
        Admin.toast(isEditing ? 'Project updated.' : 'Project published.');
        await load();
      } catch (error) {
        mapErrors(error.fields);
        if (formError) {
          formError.textContent = error.message || 'Could not save the project.';
          formError.hidden = false;
        }
        saveButton.disabled = false;
        saveButton.removeAttribute('aria-busy');
        saveButton.innerHTML = projectId.value ? 'Save changes <span aria-hidden="true">↗</span>' : 'Save project <span aria-hidden="true">↗</span>';
      }
    });
  }

  load();
})();
