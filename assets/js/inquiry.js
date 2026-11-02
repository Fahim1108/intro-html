(function () {
  'use strict';

  var form = document.getElementById('inquiryForm');
  if (!form) return;

  var successPanel = document.getElementById('inquirySuccess');
  var successName = document.getElementById('successName');
  var successReference = document.getElementById('successReference');
  var sendAnother = document.getElementById('sendAnother');
  var submitButton = document.getElementById('inquirySubmit');
  var formAlert = document.getElementById('formAlert');
  var formError = document.getElementById('formError');
  var keyInput = document.getElementById('submissionKey');
  var description = document.getElementById('description');
  var descriptionCount = document.getElementById('descriptionCount');
  var submitLabel = submitButton ? submitButton.innerHTML : '';
  var typeMap = {
    portfolio: 'Portfolio Website',
    business: 'Business Website',
    ecommerce: 'Business Website',
    'e-commerce': 'E-commerce Website',
    hospital: 'Hospital / Clinic Website',
    clinic: 'Hospital / Clinic Website',
    dental: 'Dental Chamber Website',
    doctor: 'Doctor / Professional Website',
    professional: 'Doctor / Professional Website',
    education: 'Educational Website',
    educational: 'Educational Website',
    personal: 'Personal Brand Website',
    'personal-brand': 'Personal Brand Website',
    custom: 'Custom Website',
    'custom-build': 'Custom Website'
  };
  var budgetMap = {
    under5: 'Under ৳5,000',
    'under-5000': 'Under ৳5,000',
    '5-10': '৳5,000 – ৳10,000',
    '5000-10000': '৳5,000 – ৳10,000',
    '10-15': '৳10,000 – ৳15,000',
    '10000-15000': '৳10,000 – ৳15,000',
    '15-25': '৳15,000 – ৳25,000',
    '15000-25000': '৳15,000 – ৳25,000',
    over25: '৳25,000+',
    '25000-plus': '৳25,000+'
  };
  var planMap = {
    starter: 'Under ৳5,000',
    business: '৳10,000 – ৳15,000',
    advanced: '৳15,000 – ৳25,000',
    custom: '৳25,000+'
  };

  function newSubmissionKey() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      return window.crypto.randomUUID();
    }
    var bytes = new Uint8Array(24);
    window.crypto.getRandomValues(bytes);
    return Array.prototype.map.call(bytes, function (byte) {
      return byte.toString(16).padStart(2, '0');
    }).join('');
  }

  function setSubmissionKey() {
    if (keyInput) keyInput.value = newSubmissionKey();
  }

  function fieldByName(name) {
    return form.elements.namedItem(name);
  }

  function errorNode(name) {
    return document.getElementById(name + 'Error');
  }

  function clearErrors() {
    Array.prototype.forEach.call(form.querySelectorAll('[aria-invalid="true"]'), function (input) {
      input.removeAttribute('aria-invalid');
    });
    Array.prototype.forEach.call(form.querySelectorAll('.field__error'), function (node) {
      node.textContent = '';
    });
    if (formError) {
      formError.hidden = true;
      formError.textContent = '';
    }
    if (formAlert) {
      formAlert.hidden = true;
      formAlert.textContent = '';
    }
  }

  function setError(name, message) {
    var input = fieldByName(name);
    var node = errorNode(name);
    if (input) input.setAttribute('aria-invalid', 'true');
    if (node) node.textContent = message;
  }

  function showAlert(message, focus) {
    if (formAlert) {
      formAlert.textContent = message;
      formAlert.hidden = false;
      if (focus) formAlert.focus({ preventScroll: true });
    } else if (formError) {
      formError.textContent = message;
      formError.hidden = false;
    }
  }

  function validateClient() {
    clearErrors();
    var firstInvalid = null;
    var values = {
      fullName: String(fieldByName('fullName').value || '').trim(),
      email: String(fieldByName('email').value || '').trim(),
      phone: String(fieldByName('phone').value || '').trim(),
      websiteType: String(fieldByName('websiteType').value || ''),
      budgetRange: String(fieldByName('budgetRange').value || ''),
      description: String(fieldByName('description').value || '').trim()
    };

    if (values.fullName.length < 2) {
      setError('fullName', 'Please enter your full name.');
      firstInvalid = firstInvalid || 'fullName';
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
      setError('email', 'Enter a valid email address.');
      firstInvalid = firstInvalid || 'email';
    }
    var digits = (values.phone.match(/\d/g) || []).length;
    if (!/^[+0-9()\-\s.]+$/.test(values.phone) || digits < 7) {
      setError('phone', 'Enter a valid phone or WhatsApp number.');
      firstInvalid = firstInvalid || 'phone';
    }
    if (!values.websiteType) {
      setError('websiteType', 'Choose the closest website type.');
      firstInvalid = firstInvalid || 'websiteType';
    }
    if (!values.budgetRange) {
      setError('budgetRange', 'Choose a budget range.');
      firstInvalid = firstInvalid || 'budgetRange';
    }
    if (values.description.length < 20) {
      setError('description', 'Please share at least a sentence or two (20 characters).');
      firstInvalid = firstInvalid || 'description';
    }

    if (firstInvalid) {
      var input = fieldByName(firstInvalid);
      if (input) input.focus({ preventScroll: false });
      showAlert('Please check the highlighted fields.');
      return false;
    }
    return true;
  }

  function setLoading(loading) {
    if (!submitButton) return;
    submitButton.disabled = loading;
    submitButton.setAttribute('aria-busy', loading ? 'true' : 'false');
    if (loading) {
      submitButton.innerHTML = 'Sending <span class="btn__arrow" aria-hidden="true">…</span>';
    } else {
      submitButton.innerHTML = submitLabel;
    }
  }

  function updateCount() {
    if (description && descriptionCount) descriptionCount.textContent = String(description.value.length);
  }

  function prefill() {
    var params = new URLSearchParams(window.location.search);
    var type = params.get('type');
    var budget = params.get('budget');
    var plan = params.get('plan');
    var typeSelect = fieldByName('websiteType');
    var budgetSelect = fieldByName('budgetRange');

    if (type && typeSelect) {
      if (Array.prototype.some.call(typeSelect.options, function (option) { return option.value === type; })) {
        typeSelect.value = type;
      } else if (typeMap[type.toLowerCase()]) {
        typeSelect.value = typeMap[type.toLowerCase()];
      }
    }
    if (budget && budgetSelect) {
      if (Array.prototype.some.call(budgetSelect.options, function (option) { return option.value === budget; })) {
        budgetSelect.value = budget;
      } else if (budgetMap[budget.toLowerCase()]) {
        budgetSelect.value = budgetMap[budget.toLowerCase()];
      }
    }
    if (plan && budgetSelect && !budgetSelect.value && planMap[plan.toLowerCase()]) {
      budgetSelect.value = planMap[plan.toLowerCase()];
    }
  }

  function showSuccess(inquiry) {
    var name = String(fieldByName('fullName').value || '').trim().split(/\s+/)[0] || 'friend';
    if (successName) successName.textContent = name;
    if (successReference) successReference.textContent = inquiry.reference || '';
    form.hidden = true;
    if (formAlert) formAlert.hidden = true;
    if (formError) formError.hidden = true;
    if (successPanel) {
      successPanel.hidden = false;
      successPanel.focus({ preventScroll: true });
      successPanel.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
    }
    form.reset();
    updateCount();
    setSubmissionKey();
    setLoading(false);
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    if (!validateClient()) return;

    var payload = {
      fullName: fieldByName('fullName').value.trim(),
      email: fieldByName('email').value.trim(),
      phone: fieldByName('phone').value.trim(),
      businessName: fieldByName('businessName').value.trim(),
      websiteType: fieldByName('websiteType').value,
      budgetRange: fieldByName('budgetRange').value,
      description: fieldByName('description').value.trim(),
      submissionKey: keyInput ? keyInput.value : newSubmissionKey()
    };

    setLoading(true);
    if (formAlert) formAlert.hidden = true;
    if (formError) formError.hidden = true;

    var controller = new AbortController();
    var timeout = window.setTimeout(function () { controller.abort(); }, 20000);

    fetch('/api/inquiries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
      credentials: 'same-origin'
    }).then(function (response) {
      window.clearTimeout(timeout);
      return response.json().catch(function () { return {}; }).then(function (data) {
        return { response: response, data: data };
      });
    }).then(function (result) {
      if (!result.response.ok) {
        var message = result.data.error || 'We could not send your inquiry. Please try again.';
        if (result.data.fields) {
          Object.keys(result.data.fields).forEach(function (name) {
            setError(name, result.data.fields[name]);
          });
          var first = Object.keys(result.data.fields)[0];
          var input = fieldByName(first);
          if (input) input.focus({ preventScroll: false });
        }
        showAlert(message);
        setLoading(false);
        return;
      }
      showSuccess(result.data.inquiry || {});
    }).catch(function (error) {
      window.clearTimeout(timeout);
      showAlert(error && error.name === 'AbortError'
        ? 'That took too long. Please try again or email hello@needyoursite.com.'
        : 'A connection problem stopped the form. Please try again or email hello@needyoursite.com.');
      setLoading(false);
    });
  });

  form.addEventListener('input', function (event) {
    var target = event.target;
    if (target && target.name) {
      var node = errorNode(target.name);
      if (node) node.textContent = '';
      if (target.hasAttribute('aria-invalid')) target.removeAttribute('aria-invalid');
    }
    updateCount();
  });

  if (sendAnother) {
    sendAnother.addEventListener('click', function () {
      if (successPanel) successPanel.hidden = true;
      form.hidden = false;
      form.reset();
      clearErrors();
      updateCount();
      setSubmissionKey();
      setLoading(false);
      var name = fieldByName('fullName');
      if (name) name.focus({ preventScroll: true });
      form.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    });
  }

  prefill();
  setSubmissionKey();
  updateCount();
})();
