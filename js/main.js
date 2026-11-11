/* ASTRA — comportamiento de la web.
   Todo el contenido variable sale de datos.json; el HTML trae los mismos valores
   por defecto, así que si el fetch falla (p. ej. abriendo el archivo con doble clic)
   la página se ve igual. */
(function () {
  'use strict';

  var DEFAULT_MIEMBROS = 33;
  var SVG_NS = 'http://www.w3.org/2000/svg';
  var $ = function (id) { return document.getElementById(id); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ------------------------------------------------------------------ */
  /* Constelación                                                        */
  /* ------------------------------------------------------------------ */
  // Vértices de la A: [x, y, radio]
  var A = [[220,50,7],[130,230,5.5],[310,230,5.5],[190,110,5],[250,110,5],[160,170,5],[280,170,5],[100,285,5],[340,285,5],[70,340,5],[370,340,5],[190,232,4.5],[250,228,4.5]];

  function buildStars(n) {
    var stars = [];
    for (var i = 0; i < Math.min(n, A.length); i++) {
      stars.push({ x: A[i][0], y: A[i][1], r: A[i][2], fill: '#FFC83D', cls: 'st', d: (0.1 + i * 0.08).toFixed(2) + 's' });
    }
    var seed = 7; // semilla fija: la constelación es siempre la misma
    function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
    function far(x, y) {
      if (Math.hypot(x - 400, y - 408) < 34) return false;
      for (var j = 0; j < stars.length; j++) {
        if (Math.hypot(x - stars[j].x, y - stars[j].y) < 22) return false;
      }
      return true;
    }
    var tries = 0;
    while (stars.length < n && tries < 6000) {
      tries++;
      var x = 14 + rnd() * 412;
      var y = 14 + rnd() * 400;
      if (!far(x, y)) continue;
      var k = stars.length;
      var tw = k % 3 === 0;
      stars.push({
        x: Math.round(x), y: Math.round(y), r: (2 + rnd() * 1.2).toFixed(1),
        fill: 'rgba(245,240,228,.72)',
        cls: tw ? 'st tw' : 'st',
        d: tw ? ((0.2 + k * 0.05).toFixed(2) + 's, ' + (2.6 + rnd() * 2).toFixed(1) + 's') : ((0.2 + k * 0.05).toFixed(2) + 's')
      });
    }
    return stars;
  }

  var renderedStars = null;
  function renderConstellation(n) {
    if (renderedStars === n) return;
    renderedStars = n;
    var g = $('estrellas');
    while (g.firstChild) g.removeChild(g.firstChild);
    buildStars(n).forEach(function (s) {
      var c = document.createElementNS(SVG_NS, 'circle');
      c.setAttribute('class', s.cls);
      c.setAttribute('cx', s.x);
      c.setAttribute('cy', s.y);
      c.setAttribute('r', s.r);
      c.setAttribute('fill', s.fill);
      c.style.animationDelay = s.d;
      g.appendChild(c);
    });
    $('constelacion').setAttribute('aria-label', 'Constelación de ' + n + ' estrellas, una por cada miembro de ASTRA, con forma de A, y un hueco libre al final');
  }

  // El hueco se rellena al pasar el ratón o hacer foco en "Hazte miembro" del hero
  function initSlot() {
    var cta = $('cta-hero');
    var parts = [$('slot'), $('slotfill')];
    function set(on) { parts.forEach(function (p) { p.classList.toggle('hot', on); }); }
    cta.addEventListener('mouseenter', function () { set(true); });
    cta.addEventListener('mouseleave', function () { set(false); });
    cta.addEventListener('focus', function () { set(true); });
    cta.addEventListener('blur', function () { set(false); });
  }

  /* ------------------------------------------------------------------ */
  /* Pintado desde datos.json                                            */
  /* ------------------------------------------------------------------ */
  function setText(id, text) { var el = $(id); if (el) el.textContent = text; }

  function paintMiembros(n) {
    $$('[data-miembros]').forEach(function (el) { el.textContent = n; });
    renderConstellation(n);
  }

  function paintContacto(c) {
    if (!c) return;
    if (c.instagram) $$('[data-instagram]').forEach(function (a) { a.href = c.instagram; });
    if (c.linkedin) $$('[data-linkedin]').forEach(function (a) { a.href = c.linkedin; });
    if (c.discord) $$('[data-discord]').forEach(function (a) { a.href = c.discord; });
    if (c.email) $$('[data-email]').forEach(function (a) { a.href = 'mailto:' + c.email; a.textContent = c.email; });
  }

  var MADRID = 'Europe/Madrid';
  function madridParts(date) {
    var f = new Intl.DateTimeFormat('es-ES', { timeZone: MADRID, day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false, year: 'numeric' });
    var o = {};
    f.formatToParts(date).forEach(function (p) { o[p.type] = p.value; });
    o.month = o.month.replace('.', '');
    return o;
  }
  function madridDayNumber(date) {
    var f = new Intl.DateTimeFormat('en-CA', { timeZone: MADRID, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
    var p = f.split('-');
    return Date.UTC(+p[0], +p[1] - 1, +p[2]) / 86400000;
  }
  function utcStamp(date) { return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, ''); }

  function setProximaHeading(isDefaultTitle, custom) {
    var h = $('titular-proxima');
    var text = custom || (isDefaultTitle ? null : 'Nuestra *próxima actividad*');
    if (!text) return;
    h.textContent = '';
    text.split('*').forEach(function (part, i) {
      if (!part) return;
      if (i % 2) { var s = document.createElement('span'); s.className = 'hl'; s.textContent = part; h.appendChild(s); }
      else h.appendChild(document.createTextNode(part));
    });
    if ($('proxima').classList.contains('on')) $$('.hl', h).forEach(function (x) { x.classList.add('on'); });
  }

  function gcalUrl(a) {
    return 'https://calendar.google.com/calendar/render?action=TEMPLATE' +
      '&text=' + encodeURIComponent((a.titulo || '') + ' · ASTRA') +
      '&dates=' + utcStamp(a.inicio) + '/' + utcStamp(a.fin) +
      '&location=' + encodeURIComponent((a.lugar ? a.lugar + ', ' : '') + 'Universidad de Sevilla');
  }

  // Convierte la lista de datos.json en eventos válidos, futuros y ordenados por fecha
  function normalizeEventos(list) {
    var now = Date.now();
    return (Array.isArray(list) ? list : []).map(function (e) {
      var inicio = e && e.inicio ? new Date(e.inicio) : null;
      if (!inicio || isNaN(inicio)) return null;
      var fin = e.fin ? new Date(e.fin) : null;
      if (!fin || isNaN(fin) || fin <= inicio) fin = new Date(inicio.getTime() + 2 * 3600000);
      return {
        titulo: e.titulo || '', descripcion: e.descripcion || '', lugar: e.lugar || '',
        abierta: !!e.abierta, titularSeccion: e.titularSeccion || '', inicio: inicio, fin: fin
      };
    }).filter(function (e) { return e && e.fin.getTime() > now; })
      .sort(function (a, b) { return a.inicio - b.inicio; });
  }

  // a: el próximo evento ya normalizado, o null si no hay ninguno
  function paintProxima(a) {
    var ticket = $('ticket');
    var empty = $('proxima-vacia');
    var now = new Date();

    if (!a) {
      ticket.hidden = true;
      empty.hidden = false;
      setProximaHeading(false, 'Nuestra *próxima actividad*');
      setText('rail-label-proxima', 'Actividades');
      return;
    }
    ticket.hidden = false;
    empty.hidden = true;

    var def = $('titular-proxima').getAttribute('data-titulo-defecto');
    var esDefecto = a.titulo === def;
    setProximaHeading(esDefecto, a.titularSeccion);
    setText('rail-label-proxima', esDefecto ? 'Asamblea' : 'Actividad');

    var p = madridParts(a.inicio);
    setText('act-dia', p.day);
    setText('act-fecha', p.month + ' · ' + p.hour + ':' + p.minute);
    setText('act-titulo', a.titulo);
    setText('act-desc', a.descripcion);
    setText('act-lugar', a.lugar ? 'Lugar · ' + a.lugar : '');
    $('act-abierta').hidden = !a.abierta;
    $('act-abierta').textContent = a.lugar ? ' ·  Abierta a todo el mundo, seas o no de ASTRA' : 'Abierta a todo el mundo, seas o no de ASTRA';
    $('act-cal').href = gcalUrl(a);

    var days = madridDayNumber(a.inicio) - madridDayNumber(now);
    var txt = 'faltan ' + days + ' días';
    if (days === 1) txt = '¡es mañana!';
    if (days <= 0) txt = '¡es hoy!';
    setText('act-cuenta', txt + ' ✎');
  }

  /* ------------------------------------------------------------------ */
  /* Calendario de eventos                                               */
  /* ------------------------------------------------------------------ */
  var cal = { events: [], y: 0, m: 0, sel: null };

  function dayKey(date) {
    return new Intl.DateTimeFormat('en-CA', { timeZone: MADRID, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
  }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function mk(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }
  function utcDate(y, m, d) { return new Date(Date.UTC(y, m, d)); }
  function fmtUTC(date, opts) {
    opts.timeZone = 'UTC';
    return new Intl.DateTimeFormat('es-ES', opts).format(date);
  }

  function calCountByDay() {
    var map = {};
    cal.events.forEach(function (e) {
      var k = dayKey(e.inicio);
      map[k] = (map[k] || 0) + 1;
    });
    return map;
  }

  function calRenderGrid() {
    var y = cal.y, m = cal.m;
    setText('cal-mes', fmtUTC(utcDate(y, m, 1), { month: 'long' }) + ' ' + y);
    var box = $('cal-dias');
    clear(box);
    var counts = calCountByDay();
    var today = dayKey(new Date());
    var lead = (utcDate(y, m, 1).getUTCDay() + 6) % 7; // semana que empieza en lunes
    var total = utcDate(y, m + 1, 0).getUTCDate();
    var i;
    for (i = 0; i < lead; i++) box.appendChild(mk('span', 'cal-blank'));
    for (i = 1; i <= total; i++) {
      var key = y + '-' + pad2(m + 1) + '-' + pad2(i);
      var n = counts[key] || 0;
      var cell;
      if (n) {
        cell = mk('button', 'cal-day has', String(i));
        cell.type = 'button';
        cell.setAttribute('data-key', key);
        cell.setAttribute('aria-pressed', cal.sel === key ? 'true' : 'false');
        cell.setAttribute('aria-label', i + ' de ' + fmtUTC(utcDate(y, m, 1), { month: 'long' }) + ': ' + n + (n === 1 ? ' evento' : ' eventos'));
        if (cal.sel === key) cell.classList.add('sel');
      } else {
        cell = mk('span', 'cal-day', String(i));
      }
      if (key === today) cell.classList.add('today');
      box.appendChild(cell);
    }
  }

  function calRenderList() {
    var list = $('cal-lista');
    clear(list);
    var shown = cal.sel
      ? cal.events.filter(function (e) { return dayKey(e.inicio) === cal.sel; })
      : cal.events;
    var t = 'Próximos eventos';
    if (cal.sel) {
      var p = cal.sel.split('-');
      t = 'Eventos del ' + fmtUTC(utcDate(+p[0], +p[1] - 1, +p[2]), { day: 'numeric', month: 'long' });
    }
    setText('cal-agenda-titulo', t);
    $('cal-todos').hidden = !cal.sel;

    shown.forEach(function (e) {
      var pp = madridParts(e.inicio);
      var pf = madridParts(e.fin);
      var li = mk('li', 'cal-ev');
      var date = mk('div', 'cal-ev-date');
      date.appendChild(mk('span', 'serif day', pp.day));
      date.appendChild(mk('span', 'mono mes', pp.month));
      var body = mk('div', 'cal-ev-body');
      body.appendChild(mk('h4', 'serif', e.titulo));
      var meta = pp.hour + ':' + pp.minute + ' – ' + pf.hour + ':' + pf.minute + (e.lugar ? ' · ' + e.lugar : '');
      body.appendChild(mk('p', 'mono cal-ev-meta', meta));
      if (e.descripcion) body.appendChild(mk('p', 'cal-ev-desc', e.descripcion));
      if (e.abierta) body.appendChild(mk('p', 'cal-ev-open', 'Abierta a todo el mundo, seas o no de ASTRA'));
      var a = mk('a', 'link-min', 'Añadir a mi calendario');
      a.href = gcalUrl(e);
      a.target = '_blank';
      a.rel = 'noopener';
      body.appendChild(a);
      li.appendChild(date);
      li.appendChild(body);
      list.appendChild(li);
    });
  }

  function calRender() { calRenderGrid(); calRenderList(); }

  function calShiftMonth(delta) {
    var d = utcDate(cal.y, cal.m + delta, 1);
    cal.y = d.getUTCFullYear();
    cal.m = d.getUTCMonth();
    calRenderGrid();
  }

  function initCalendar() {
    $('cal-prev').addEventListener('click', function () { calShiftMonth(-1); });
    $('cal-next').addEventListener('click', function () { calShiftMonth(1); });
    $('cal-todos').addEventListener('click', function () { cal.sel = null; calRender(); });
    $('cal-dias').addEventListener('click', function (ev) {
      var b = ev.target.closest ? ev.target.closest('button[data-key]') : null;
      if (!b) return;
      var k = b.getAttribute('data-key');
      cal.sel = cal.sel === k ? null : k;
      calRender();
      var again = $('cal-dias').querySelector('button[data-key="' + k + '"]');
      if (again) again.focus();
      if (cal.sel && window.innerWidth <= 760) {
        $('cal-agenda-titulo').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
      }
    });
  }

  function paintCalendario(events) {
    cal.events = events;
    $('calendario').hidden = !events.length;
    if (!events.length) return;
    var k = dayKey(events[0].inicio).split('-');
    cal.y = +k[0];
    cal.m = +k[1] - 1;
    cal.sel = null;
    calRender();
  }

  function paintMentorias(m) {
    if (!m) return;
    if (m.pedirUrl) $('mentor-pedir').href = m.pedirUrl;
    if (m.ofrecerUrl) $('mentor-ofrecer').href = m.ofrecerUrl;
  }

  function paintApuntes(ap) {
    if (!ap) return;
    var prim = $('apuntes-primario');
    var sec = $('apuntes-secundario');
    var disponible = !!ap.disponible && !!ap.url;
    $('apuntes-sello').hidden = disponible;
    setText('apuntes-etiqueta', disponible ? 'Nº 04 — Apuntes' : 'Nº 04 — Apuntes · en construcción');
    if (disponible) {
      setText('apuntes-lede', 'La app de apuntes de la ETSII ya está abierta: encuentra los apuntes organizados por curso y asignatura.');
      prim.textContent = 'Explorar apuntes';
      prim.href = ap.url;
      sec.textContent = 'Comparte tus apuntes';
      sec.href = ap.compartirUrl || '#unete';
    } else {
      prim.textContent = 'Comparte tus apuntes';
      if (ap.compartirUrl) prim.href = ap.compartirUrl;
    }
  }

  var ROT = [-2, 1.6, -1];
  var TAPE_ROT = [-3, 4, -5];
  function formatMes(f) {
    var m = /^(\d{4})-(\d{2})/.exec(f || '');
    if (!m) return f || '';
    var d = new Date(Date.UTC(+m[1], +m[2] - 1, 1));
    return new Intl.DateTimeFormat('es-ES', { timeZone: 'UTC', month: 'long', year: 'numeric' }).format(d);
  }
  function paintBitacora(items) {
    var vacia = !items || !items.length;
    $('bitacora-vacia').hidden = !vacia;
    $('bitacora-fotos').hidden = vacia;
    if (vacia) return;
    var grid = $('bitacora-grid');
    while (grid.firstChild) grid.removeChild(grid.firstChild);
    items.forEach(function (it, i) {
      var fig = document.createElement('figure');
      fig.className = 'polaroid';
      fig.style.transform = 'rotate(' + ROT[i % 3] + 'deg)';
      if (i % 3 === 1) fig.style.marginTop = '24px';
      var tape = document.createElement('span');
      tape.className = 'tape';
      tape.style.transform = 'rotate(' + TAPE_ROT[i % 3] + 'deg)';
      var img = document.createElement('img');
      img.src = it.foto;
      img.alt = it.alt || '';
      img.width = 800;
      img.height = 600;
      img.loading = 'lazy';
      var cap = document.createElement('figcaption');
      cap.className = 'hand';
      var mes = formatMes(it.fecha);
      cap.textContent = (it.titulo || '') + (mes ? ' · ' + mes : '');
      fig.appendChild(tape);
      fig.appendChild(img);
      fig.appendChild(cap);
      grid.appendChild(fig);
    });
  }

  function paint(d) {
    var n = Math.max(1, Math.min(150, Math.round(Number(d.miembros) || DEFAULT_MIEMBROS)));
    paintMiembros(n);
    paintContacto(d.contacto);
    if (d.formularioInscripcion) $('form-link').href = d.formularioInscripcion;
    paintMentorias(d.mentorias);
    paintApuntes(d.apuntes);
    // "eventos" es la lista editable desde admin.html; "proximaActividad" se admite por compatibilidad
    var eventos = normalizeEventos(d.eventos != null ? d.eventos : (d.proximaActividad ? [d.proximaActividad] : []));
    paintProxima(eventos[0] || null);
    paintCalendario(eventos);
    paintBitacora(d.bitacora);
  }

  /* ------------------------------------------------------------------ */
  /* Revelaciones por scroll (IntersectionObserver)                      */
  /* ------------------------------------------------------------------ */
  function reveal(el) {
    el.classList.add('on');
    $$('.hl, .sheets', el).forEach(function (x) { x.classList.add('on'); });
  }
  function initReveal() {
    var sections = $$('main > section[id]');
    var targets = sections.slice();
    var steps = $('pasos');
    if (!('IntersectionObserver' in window) || reduceMotion) {
      targets.concat([steps, $('hero-hl')]).forEach(reveal);
      return;
    }
    // El titular se subraya cuando el borde superior de la sección pasa del 78% de la ventana
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        reveal(e.target);
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -22% 0px' });
    targets.forEach(function (s) { if (s.id !== 'inicio') io.observe(s); });
    var ioSteps = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('on');
        ioSteps.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -20% 0px' });
    ioSteps.observe(steps);
    setTimeout(function () { $('hero-hl').classList.add('on'); }, 300);
  }

  /* ------------------------------------------------------------------ */
  /* Índice lateral, guía y progreso (rAF + scroll pasivo)               */
  /* ------------------------------------------------------------------ */
  var IDS = ['inicio', 'proxima', 'mentorias', 'apuntes', 'bitacora', 'ventajas', 'unete'];
  var PTS = [[30, 20], [72, 92], [26, 164], [70, 236], [28, 308], [66, 380], [30, 452]];

  function initProgress() {
    var stars = $$('.rail-star');
    var guide = $('rail-guide');
    var railLine = $('rail-progress');
    var topbar = $('topbar');
    var raf = 0, lastActive = -1, lastProg = -1;

    function tick() {
      raf = 0;
      var vh = window.innerHeight || 800;
      var active = 0;
      IDS.forEach(function (id, i) {
        var el = $(id);
        if (el && el.getBoundingClientRect().top < vh * 0.55) active = i;
      });
      var se = document.scrollingElement || document.documentElement;
      var max = se.scrollHeight - se.clientHeight;
      var prog = max > 0 ? Math.min(1, Math.max(0, se.scrollTop / max)) : 0;

      if (active !== lastActive) {
        lastActive = active;
        stars.forEach(function (s, i) {
          s.classList.toggle('done', i < active);
          s.classList.toggle('now', i === active);
          if (i === active) s.setAttribute('aria-current', 'location'); else s.removeAttribute('aria-current');
        });
        guide.style.left = PTS[active][0] + 'px';
        guide.style.top = PTS[active][1] + 'px';
      }
      if (Math.abs(prog - lastProg) > 0.002) {
        lastProg = prog;
        railLine.setAttribute('stroke-dashoffset', String(1 - prog));
        topbar.style.transform = 'scaleX(' + prog + ')';
      }
    }
    function request() { if (!raf) raf = requestAnimationFrame(tick); }
    window.addEventListener('scroll', request, { passive: true });
    window.addEventListener('resize', request);
    tick();
  }

  /* ------------------------------------------------------------------ */
  /* Arranque                                                            */
  /* ------------------------------------------------------------------ */
  // Menú de la cabecera en móvil
  function initNav() {
    var btn = $('nav-toggle');
    var nav = $('main-nav');
    if (!btn || !nav) return;
    function set(open) {
      nav.classList.toggle('open', open);
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    }
    btn.addEventListener('click', function () { set(!nav.classList.contains('open')); });
    $$('a', nav).forEach(function (a) { a.addEventListener('click', function () { set(false); }); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') set(false); });
  }

  function start() {
    renderConstellation(DEFAULT_MIEMBROS);
    initSlot();
    initNav();
    initCalendar();
    initReveal();
    initProgress();
    fetch('datos.json', { cache: 'no-cache' })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (d) { paint(d); })
      .catch(function () { /* se queda con los valores por defecto del HTML */ });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
