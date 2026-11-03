// Shared behaviour across the HalalBridge homepage and service detail pages.
const toggle = document.querySelector('.menu-toggle');
const nav = document.querySelector('.nav');

if (toggle && nav) {
  toggle.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(open));
  });
  nav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
    nav.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
  }));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && nav.classList.contains('open')) {
      nav.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.focus();
    }
  });
}

const year = document.getElementById('year');
if (year) year.textContent = new Date().getFullYear();

if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  }), { threshold: 0.12 });
  document.querySelectorAll('.reveal').forEach(element => observer.observe(element));
}

const dept = document.getElementById('department');
const service = document.getElementById('service');
const labFields = document.getElementById('lab-request-fields');
const labSelect = document.getElementById('preferred-laboratory');
const requiredTest = document.querySelector('[name="required_test"]');
const inquiryForm = document.getElementById('inquiry-form');
const feedback = document.getElementById('form-feedback');
const whatsappLink = document.getElementById('whatsapp-enquiry');
const formSubmitButton = inquiryForm?.querySelector('button[type="submit"]');

const options = {
  'Halal Research': ['Ingredient Halal Status Assessment', 'Product Halal Assessment', 'Shariah Research Question', 'Technical Ingredient Query'],
  'Halal Training': ['Basic Halal Awareness', 'Halal Internal Auditor Training', 'Halal Lead Auditor Training', 'HACCP / ISO / GMP Training', 'Corporate Training'],
  'Certification': ['Halal Certification', 'ISO Certification', 'HACCP Certification', 'GMP Certification', 'Certification Consultancy'],
  'Laboratory Testing': ['Food Product Testing', 'Ingredient Composition Analysis', 'Microbiological Testing', 'Chemical / Additive Analysis', 'Halal-related Product Testing', 'Species / DNA Identification', 'Gelatin / Collagen Source Analysis', 'Alcohol / Ethanol Analysis', 'Contaminants / Residue Testing', 'Find a Suitable Laboratory', 'Other'],
  'General Inquiry': ['General Information', 'Partnership', 'Other']
};

function updateServices() {
  if (!dept || !service) return;
  service.innerHTML = '<option value="">Choose a service</option>';
  (options[dept.value] || []).forEach(item => {
    const option = document.createElement('option');
    option.textContent = item;
    service.appendChild(option);
  });
  const isLab = dept.value === 'Laboratory Testing';
  if (labFields) labFields.hidden = !isLab;
  if (labSelect) labSelect.required = isLab;
  if (requiredTest) requiredTest.required = isLab;
  if (formSubmitButton) {
    formSubmitButton.innerHTML = isLab
      ? 'Submit lab testing request <span>→</span>'
      : 'Send enquiry <span>→</span>';
  }
}

function updateWhatsAppLink() {
  if (!inquiryForm || !whatsappLink) return;
  const data = Object.fromEntries(new FormData(inquiryForm).entries());
  const message = 'HalalBridge enquiry\\nName: ' + (data.name || '') +
    '\\nEmail: ' + (data.email || '') +
    '\\nCompany: ' + (data.company || '') +
    '\\nDepartment: ' + (data.department || '') +
    '\\nService: ' + (data.service || '') +
    '\\nProduct / sample: ' + (data.product_name || '') +
    '\\nPreferred laboratory: ' + (data.preferred_laboratory || '') +
    '\\nRequired test: ' + (data.required_test || '') +
    '\\nPreferred city: ' + (data.preferred_city || '') +
    '\\nStandard: ' + (data.standard || '') +
    '\\nPhone: ' + (data.phone || '') +
    '\\nMessage: ' + (data.message || '');
  whatsappLink.href = 'https://wa.me/92311211122291?text=' + encodeURIComponent(message);
}

if (dept) {
  dept.addEventListener('change', updateServices);
  document.querySelectorAll('[data-department]').forEach(link => link.addEventListener('click', () => {
    dept.value = link.dataset.department;
    updateServices();
  }));
}

if (inquiryForm) {
  inquiryForm.addEventListener('input', updateWhatsAppLink);
  inquiryForm.addEventListener('change', updateWhatsAppLink);
  inquiryForm.addEventListener('submit', async event => {
    event.preventDefault();
    if (!inquiryForm.reportValidity()) return;

    const submitButton = inquiryForm.querySelector('button[type="submit"]');
    const isLabRequest = dept?.value === 'Laboratory Testing';
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = 'Sending…';
    }
    if (feedback) feedback.textContent = 'Sending your enquiry securely…';

    let databaseSaved = false;
    try {
      const formData = new FormData(inquiryForm);
      const config = window.HALALBRIDGE_SUPABASE || {};
      if (isLabRequest && config.url && config.anonKey && window.supabase) {
        const db = window.supabase.createClient(config.url, config.anonKey);
        const request = {
          name: String(formData.get('name') || '').trim(),
          email: String(formData.get('email') || '').trim(),
          company: String(formData.get('company') || '').trim() || null,
          phone: String(formData.get('phone') || '').trim() || null,
          product_name: String(formData.get('product_name') || '').trim() || null,
          preferred_city: String(formData.get('preferred_city') || '').trim() || null,
          preferred_laboratory: String(formData.get('preferred_laboratory') || '').trim(),
          required_test: String(formData.get('required_test') || '').trim(),
          department: 'Laboratory Testing',
          service: String(formData.get('service') || '').trim() || null,
          standard: String(formData.get('standard') || '').trim() || null,
          message: String(formData.get('message') || '').trim()
        };
        const { error } = await db.from('lab_testing_requests').insert(request);
        if (error) throw new Error('Database submission failed: ' + error.message);
        databaseSaved = true;
      }

      const response = await fetch(inquiryForm.action, {
        method: 'POST',
        body: formData,
        headers: { Accept: 'application/json' }
      });
      const result = await response.json();
      if (!response.ok || result.success === 'false') {
        if (databaseSaved) {
          if (feedback) feedback.textContent = 'Your lab request has been safely recorded in the HalalBridge dashboard, but the email notification could not be sent. Please also email contacthalalbridge@gmail.com if urgent.';
        } else {
          throw new Error(result.message || 'Email submission failed');
        }
      } else if (feedback) {
        feedback.textContent = databaseSaved
          ? 'Thank you. Your laboratory request has been recorded and the HalalBridge team has been notified.'
          : 'Thank you. Your enquiry has been submitted successfully. Our team will contact you soon.';
      }

      inquiryForm.reset();
      updateServices();
      updateWhatsAppLink();
    } catch (error) {
      if (feedback) {
        feedback.textContent = isLabRequest && !databaseSaved && /Database submission failed/.test(error.message)
          ? 'The admin database could not save this request. Please use WhatsApp or email contacthalalbridge@gmail.com so the team can receive it.'
          : 'We could not submit the form. Please use the WhatsApp option or email contacthalalbridge@gmail.com directly.';
      }
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.innerHTML = dept?.value === 'Laboratory Testing'
          ? 'Submit lab testing request <span>→</span>'
          : 'Send enquiry <span>→</span>';
      }
    }
  });
  updateServices();
  updateWhatsAppLink();
}

/* Search and filter the laboratory directory on the homepage only. */
(function () {
  const search = document.getElementById('lab-search');
  const city = document.getElementById('lab-city');
  const test = document.getElementById('lab-test');
  const grid = document.getElementById('lab-grid');
  if (!grid || !search || !city || !test) return;

  const cards = [...grid.querySelectorAll('.lab-card')];
  const count = document.getElementById('lab-result-count');
  const empty = document.getElementById('lab-empty');

  function filterLabs() {
    const query = (search.value || '').trim().toLowerCase();
    const selectedCity = city.value.toLowerCase();
    const selectedTest = test.value.toLowerCase();
    let shown = 0;

    cards.forEach(card => {
      const matchesText = !query || card.textContent.toLowerCase().includes(query);
      const matchesCity = !selectedCity || card.dataset.city === selectedCity;
      const matchesTest = !selectedTest || (card.dataset.tests || '').split(' ').includes(selectedTest);
      const visible = matchesText && matchesCity && matchesTest;
      card.hidden = !visible;
      if (visible) shown++;
    });

    if (count) count.textContent = 'Showing ' + shown + ' of ' + cards.length + ' listed laboratories';
    if (empty) empty.hidden = shown !== 0;
  }

  [search, city, test].forEach(element => {
    element.addEventListener('input', filterLabs);
    element.addEventListener('change', filterLabs);
  });

  document.querySelectorAll('[data-lab-enquiry]').forEach(link => link.addEventListener('click', () => {
    if (dept) {
      dept.value = 'Laboratory Testing';
      updateServices();
    }
    const message = document.querySelector('[name="message"]');
    if (message && !message.value) {
      message.value = 'I would like help finding a suitable laboratory in Pakistan for product testing. Product / sample: ; Required test / parameter: ; Preferred city: ';
    }
  }));

  filterLabs();
})();

/* Accessible five-service hero carousel: one controller, autoplay and smooth transitions */
(function () {
  const root = document.querySelector('.hero-carousel');
  if (!root) return;

  const slides = Array.from(root.querySelectorAll('.hero-slide'));
  const dots = Array.from(root.querySelectorAll('.hero-pagination button'));
  const previous = root.querySelector('.hero-prev');
  const next = root.querySelector('.hero-next');
  if (slides.length < 2) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const interval = 3000;
  let active = Math.max(0, slides.findIndex(slide => slide.classList.contains('is-active')));
  let timer = null;
  let paused = false;

  function render(index) {
    active = (index + slides.length) % slides.length;
    slides.forEach((slide, i) => {
      const selected = i === active;
      slide.classList.toggle('is-active', selected);
      slide.setAttribute('aria-hidden', String(!selected));
      slide.inert = !selected;
    });
    dots.forEach((dot, i) => {
      const selected = i === active;
      dot.classList.toggle('is-active', selected);
      if (selected) {
        dot.setAttribute('aria-current', 'true');
      } else {
        dot.removeAttribute('aria-current');
      }
    });
    root.dataset.activeSlide = String(active);
  }

  function stop() {
    if (timer !== null) {
      window.clearInterval(timer);
      timer = null;
    }
  }

  function start() {
    stop();
    if (paused || reduceMotion.matches || document.hidden) return;
    timer = window.setInterval(() => render(active + 1), interval);
  }

  function moveTo(index) {
    render(index);
    start();
  }

  previous?.addEventListener('click', () => moveTo(active - 1));
  next?.addEventListener('click', () => moveTo(active + 1));
  dots.forEach((dot, index) => dot.addEventListener('click', () => moveTo(index)));

  root.addEventListener('mouseenter', () => { paused = true; stop(); });
  root.addEventListener('mouseleave', () => { paused = false; start(); });
  root.addEventListener('focusin', () => { paused = true; stop(); });
  root.addEventListener('focusout', event => {
    if (!root.contains(event.relatedTarget)) {
      paused = false;
      start();
    }
  });
  document.addEventListener('visibilitychange', start);
  reduceMotion.addEventListener?.('change', start);

  render(active);
  start();
})();
