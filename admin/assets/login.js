(function () {
  'use strict';

  var form = document.getElementById('loginForm');
  if (!form) return;
  var email = document.getElementById('loginEmail');
  var password = document.getElementById('loginPassword');
  var submit = document.getElementById('loginSubmit');
  var errorBox = document.getElementById('loginError');
  var toggle = document.getElementById('passwordToggle');
  var submitLabel = submit.innerHTML;
  var next = new URLSearchParams(window.location.search).get('next') || '/admin';
  if (!/^\/admin(?:\/|$)/.test(next)) next = '/admin';

  if (toggle) {
    toggle.addEventListener('click', function () {
      var showing = password.type === 'text';
      password.type = showing ? 'password' : 'text';
      toggle.textContent = showing ? 'Show password' : 'Hide password';
      toggle.setAttribute('aria-pressed', showing ? 'false' : 'true');
      password.focus();
    });
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    if (errorBox) errorBox.hidden = true;
    var valid = true;
    [email, password].forEach(function (input) {
      if (!input.value.trim()) {
        input.setAttribute('aria-invalid', 'true');
        valid = false;
      } else {
        input.removeAttribute('aria-invalid');
      }
    });
    if (!valid) {
      if (errorBox) {
        errorBox.textContent = 'Enter your email and password.';
        errorBox.hidden = false;
      }
      (email.value.trim() ? password : email).focus();
      return;
    }

    submit.disabled = true;
    submit.setAttribute('aria-busy', 'true');
    submit.innerHTML = 'Signing in <span aria-hidden="true">…</span>';

    fetch('/api/admin/login', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ email: email.value.trim(), password: password.value })
    }).then(function (response) {
      return response.json().catch(function () { return {}; }).then(function (data) {
        return { response: response, data: data };
      });
    }).then(function (result) {
      if (!result.response.ok) {
        if (errorBox) {
          errorBox.textContent = result.data.error || 'Could not sign in. Try again.';
          errorBox.hidden = false;
        }
        submit.disabled = false;
        submit.removeAttribute('aria-busy');
        submit.innerHTML = submitLabel;
        password.focus();
        password.select();
        return;
      }
      window.location.assign(next);
    }).catch(function () {
      if (errorBox) {
        errorBox.textContent = 'A connection problem stopped sign-in. Please try again.';
        errorBox.hidden = false;
      }
      submit.disabled = false;
      submit.removeAttribute('aria-busy');
      submit.innerHTML = submitLabel;
    });
  });
})();
