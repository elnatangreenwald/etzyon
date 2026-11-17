(() => {
  const WA_PHONE = '972523114394';
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  /* Header state */
  const header = $('#header');
  const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 30);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* Mobile menu */
  const burger = $('#burger');
  const nav = $('#nav');
  const setMenu = (open) => {
    burger.setAttribute('aria-expanded', open);
    burger.setAttribute('aria-label', open ? 'סגירת תפריט' : 'פתיחת תפריט');
    nav.classList.toggle('is-open', open);
    document.body.classList.toggle('menu-open', open);
    document.body.style.overflow = open ? 'hidden' : '';
  };
  burger.addEventListener('click', () => setMenu(burger.getAttribute('aria-expanded') !== 'true'));
  $$('a', nav).forEach(a => a.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });

  /* Active nav link = current page */
  const page = document.body.dataset.page;
  $$('.nav__link').forEach(l => {
    const on = l.dataset.page === page;
    l.classList.toggle('is-active', on);
    if (on) l.setAttribute('aria-current', 'page');
  });

  /* Reveal on scroll */
  const io = new IntersectionObserver(entries => {
    entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  $$('.reveal').forEach(el => io.observe(el));

  /* Preselect a service chip from the page (service pages set data-service on <body>) */
  const preset = document.body.dataset.service;
  if (preset) $$('#chips input').forEach(i => { if (i.value === preset) i.checked = true; });

  /* Blog search */
  const search = $('#blog-search');
  if (search) {
    const cards = $$('#blog-grid .post-card');
    const feature = $('#blog-feature');
    const empty = $('#blog-empty');
    const count = $('#blog-count');
    const title = $('#grid-title');
    const chips = $$('.topic');
    let topic = '';
    const run = () => {
      const q = search.value.trim().toLowerCase();
      const filtering = !!(q || topic);
      let n = 0;
      cards.forEach(c => {
        const hit = (!q || c.textContent.toLowerCase().includes(q)) &&
                    (!topic || c.dataset.topics.split(' ').includes(topic));
        // with no filter the newest post is already shown as the featured card
        c.hidden = !hit || (!filtering && c.hasAttribute('data-first'));
        if (hit) n++;
      });
      if (feature) feature.hidden = filtering;
      empty.hidden = n > 0;
      count.textContent = n;
      const active = chips.find(ch => ch.dataset.topic === topic);
      title.textContent = !filtering ? 'כל המאמרים' : topic && !q ? active.firstChild.textContent.trim() : 'תוצאות חיפוש';
    };
    chips.forEach(ch => ch.addEventListener('click', () => {
      topic = ch.dataset.topic;
      chips.forEach(c => { c.classList.toggle('is-active', c === ch); c.setAttribute('aria-pressed', c === ch); });
      run();
    }));
    search.addEventListener('input', run);
    $('#blog-reset').addEventListener('click', () => { search.value = ''; chips[0].click(); search.focus(); });
    run();
  }

  /* Reading progress (articles) */
  const bar = $('.progress');
  const article = $('.prose');
  if (bar && article) {
    const upd = () => {
      const r = article.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, (innerHeight * 0.4 - r.top) / r.height));
      bar.style.transform = `scaleX(${p})`;
    };
    upd();
    window.addEventListener('scroll', () => requestAnimationFrame(upd), { passive: true });
  }

  /* Testimonials slider */
  const slider = $('#slider');
  if (slider) initSlider(slider);

  function initSlider(slider) {
  const slides = $$('.quote', slider);
  const dots = $('#dots');
  slides.forEach((_, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.tabIndex = -1;
    b.addEventListener('click', () => goTo(i));
    dots.appendChild(b);
  });
  const step = () => slides[0].getBoundingClientRect().width + 22;
  const current = () => Math.round(Math.abs(slider.scrollLeft) / step());
  const goTo = (i) => {
    i = Math.max(0, Math.min(slides.length - 1, i));
    // RTL: scrollLeft is negative in modern browsers
    slider.scrollTo({ left: -i * step(), behavior: 'smooth' });
  };
  const updateDots = () => {
    const c = current();
    $$('button', dots).forEach((d, i) => d.classList.toggle('is-active', i === c));
    const max = slider.scrollWidth - slider.clientWidth;
    $('[data-dir="prev"]').disabled = Math.abs(slider.scrollLeft) < 4;
    $('[data-dir="next"]').disabled = Math.abs(slider.scrollLeft) > max - 4;
  };
  slider.addEventListener('scroll', () => requestAnimationFrame(updateDots), { passive: true });
  $$('.slider-btn').forEach(b => b.addEventListener('click', () => goTo(current() + (b.dataset.dir === 'next' ? 1 : -1))));
  slider.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(current() + 1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); goTo(current() - 1); }
  });
  updateDots();
  window.addEventListener('resize', updateDots);
  }

  /* Lead forms — validate, then email the lead via FormSubmit (https://formsubmit.co).
     The first submission sends an activation email to LEAD_EMAIL; leads arrive only after it is confirmed.
     If sending fails, the visitor is offered WhatsApp with the same details instead. */
  const LEAD_EMAIL = 'ygtr1013@gmail.com';
  const LEAD_ENDPOINT = `https://formsubmit.co/ajax/${LEAD_EMAIL}`;
  const emailOk = v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  const telOk = v => v.replace(/\D/g, '').length >= 9;

  $$('.js-lead-form').forEach(form => {
    const msg = $('.form-msg', form);
    const btn = $('button[type="submit"]', form);
    form.addEventListener('submit', async e => {
      e.preventDefault();
      if (btn.disabled) return;
      if (form.website && form.website.value) return; // honeypot
      const name = form.name.value.trim();
      const tel = form.tel.value.trim();
      const email = form.email.value.trim();
      [form.name, form.tel, form.email].forEach(i => i.classList.remove('is-invalid'));
      msg.className = 'form-msg';

      let err = '';
      if (!name) { form.name.classList.add('is-invalid'); err = 'נא למלא שם מלא'; }
      else if (!tel && !email) { form.tel.classList.add('is-invalid'); err = 'נא להשאיר טלפון או כתובת אימייל'; }
      else if (tel && !telOk(tel)) { form.tel.classList.add('is-invalid'); err = 'מספר הטלפון אינו תקין'; }
      else if (email && !emailOk(email)) { form.email.classList.add('is-invalid'); err = 'כתובת האימייל אינה תקינה'; }

      if (err) { msg.textContent = err; msg.classList.add('is-err'); return; }

      const services = $$('input[name="service"]:checked', form).map(i => i.value);
      const lines = [
        `${form.dataset.kind} – etzyon.com`,
        `שם: ${name}`,
        tel && `טלפון: ${tel}`,
        email && `אימייל: ${email}`,
        services.length && `תחום: ${services.join(', ')}`
      ].filter(Boolean);

      const waUrl = `https://api.whatsapp.com/send?phone=${WA_PHONE}&text=${encodeURIComponent(lines.join('\n'))}`;

      btn.disabled = true;
      btn.setAttribute('aria-busy', 'true');
      msg.textContent = 'שולח...';
      try {
        const res = await fetch(LEAD_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({
            _subject: `${form.dataset.kind} – ${name}`,
            _template: 'table',
            _replyto: email || undefined,
            _honey: '',
            'סוג פנייה': form.dataset.kind,
            'שם': name,
            'טלפון': tel || '-',
            'אימייל': email || '-',
            'תחום': services.join(', ') || '-',
            'עמוד': location.href
          })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || String(data.success) !== 'true') throw new Error(data.message || res.status);
        msg.textContent = 'תודה! הפרטים התקבלו ואצור אתכם קשר אישית.';
        msg.classList.add('is-ok');
        form.reset();
      } catch (err) {
        msg.textContent = 'השליחה לא הצליחה. אפשר לשלוח לנו את הפרטים ';
        const a = document.createElement('a');
        a.href = waUrl; a.target = '_blank'; a.rel = 'noopener';
        a.textContent = 'בוואטסאפ';
        msg.append(a, '.');
        msg.classList.add('is-err');
      } finally {
        btn.disabled = false;
        btn.removeAttribute('aria-busy');
      }
    });
  });

  /* Copy-link buttons (articles) */
  $$('[data-copy-link]').forEach(b => b.addEventListener('click', () => {
    if (navigator.clipboard) navigator.clipboard.writeText(location.href);
    b.blur();
  }));

  const y = $('#year'); if (y) y.textContent = new Date().getFullYear();
})();
