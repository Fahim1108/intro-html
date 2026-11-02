(function () {
  'use strict';

  var form = document.getElementById('accountForm');
  if (!form) return;
  var email = document.getElementById('accountEmail');
  var currentPassword = document.getElementById('currentPassword');
  var newPassword = document.getElementById('newPassword');
  var confirmPassword = document.getElementById('confirmPassword');
  var errorBox = document.getElementById('accountError');
  var save = document.getElementById('saveAccount');
  var label = save.innerHTML;

  function clearErrors() {
    ['email', 'currentPassword', 'newPassword', 'confirmPassword'].forEach(function (name) {
      var node = document.getElementById(name + 'Error');
      if (node) node.textContent = '';
      var field = form.elements.namedItem(name);
      if (field) field.removeAttribute('aria-invalid');
    });
    if (errorBox) {
      errorBox.hidden = true;
      errorBox.textContent = '';
    }
  }

  function setError(name, message) {
    var node = document.getElementById(name + 'Error');
    if (node) node.textContent = message;
    var field = form.elements.namedItem(name);
    if (field) field.setAttribute('aria-invalid', 'true');
  }

  Admin.api('/api/admin/me').then(function (data) {
    if (data.admin && email) email.value = data.admin.email;
  }).catch(function (error) {
    if (error.status !== 401) {
      if (errorBox) {
        errorBox.textContent = error.message;
        errorBox.hidden = false;
      }
    }
  });

  form.addEventListener('input', function (event) {
    if (!event.target.name) return;
    var node = document.getElementById(event.target.name + 'Error');
    if (node) node.textContent = '';
    event.target.removeAttribute('aria-invalid');
    if (errorBox) errorBox.hidden = true;
  });

  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    clearErrors();
    var valid = true;
    if (!email.value.trim()) {
      setError('email', 'Enter the account email.');
      valid = false;
    }
    if (!currentPassword.value) {
      setError('currentPassword', 'Enter your current password.');
      valid = false;
    }
    if (newPassword.value && newPassword.value.length < 12) {
      setError('newPassword', 'Use at least 12 characters.');
      valid = false;
    }
    if (newPassword.value !== confirmPassword.value) {
      setError('confirmPassword', 'The new passwords do not match.');
      valid = false;
    }
    if (!valid) return;

    var payload = {
      email: email.value.trim(),
      currentPassword: currentPassword.value
    };
    if (newPassword.value) payload.newPassword = newPassword.value;

    save.disabled = true;
    save.setAttribute('aria-busy', 'true');
    save.innerHTML = 'Saving <span aria-hidden="true">…</span>';
    try {
      var data = await Admin.api('/api/admin/account', { method: 'PATCH', body: payload });
      if (data.signedOut) {
        window.location.assign('/admin/login');
        return;
      }
      currentPassword.value = '';
      newPassword.value = '';
      confirmPassword.value = '';
      Admin.qsa('[data-admin-email]').forEach(function (node) {
        node.textContent = data.admin ? data.admin.email : email.value;
      });
      Admin.toast('Admin details updated.');
      save.disabled = false;
      save.removeAttribute('aria-busy');
      save.innerHTML = label;
    } catch (error) {
      if (error.fields) {
        Object.keys(error.fields).forEach(function (field) {
          if (field === 'newPassword' || field === 'currentPassword' || field === 'email') setError(field, error.fields[field]);
        });
      }
      if (errorBox) {
        errorBox.textContent = error.message || 'Could not update account details.';
        errorBox.hidden = false;
      }
      save.disabled = false;
      save.removeAttribute('aria-busy');
      save.innerHTML = label;
    }
  });
})();
