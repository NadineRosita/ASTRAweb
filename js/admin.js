/* ASTRA — panel de eventos.
   Lee y escribe datos.json en el repositorio de GitHub con la API de contenidos.
   El permiso lo da el token personal de cada persona: sin acceso de escritura al
   repositorio no se puede guardar nada. El token nunca sale del navegador salvo
   hacia api.github.com. */
(function () {
  'use strict';

  var MADRID = 'Europe/Madrid';
  var FILE = 'datos.json';
  var LS_TOKEN = 'astra-admin-token';
  var LS_CFG = 'astra-admin-repo';

  var $ = function (id) { return document.getElementById(id); };

  var cfg = { owner: 'NadineRosita', repo: 'ASTRAweb', branch: 'main' };
  var token = '';
  var data = null;      // contenido completo de datos.json
  var sha = '';         // versión del archivo que hemos leído
  var eventos = [];     // copia de trabajo
  var editando = null;  // null = sin formulario; objeto = evento que se edita; 'nuevo' = alta
  var dirty = false;

  /* ---------------- Utilidades ---------------- */
  function msg(id, text, kind) {
    var el = $(id);
    el.textContent = text || '';
    el.className = 'admin-msg' + (kind ? ' ' + kind : '');
  }
  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }
  function mk(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function toB64(str) {
    var bytes = new TextEncoder().encode(str);
    var bin = '';
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  }
  function fromB64(b64) {
    var bin = atob(b64.replace(/\s/g, ''));
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder('utf-8').decode(bytes);
  }

  /* ---------------- Horas de Madrid ---------------- */
  var fmtParts = new Intl.DateTimeFormat('en-GB', {
    timeZone: MADRID, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  });
  function madridWallMs(date) {
    var o = {};
    fmtParts.formatToParts(date).forEach(function (p) { o[p.type] = p.value; });
    return Date.UTC(+o.year, +o.month - 1, +o.day, +o.hour, +o.minute);
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }

  // "2026-11-20T12:30:00+01:00" -> "2026-11-20T12:30" (hora de Madrid)
  function isoToInput(iso) {
    var d = new Date(iso);
    if (isNaN(d)) return '';
    return new Date(madridWallMs(d)).toISOString().slice(0, 16);
  }
  // "2026-11-20T12:30" (hora de Madrid) -> "2026-11-20T12:30:00+01:00"
  function inputToIso(v) {
    var m = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})$/.exec(v || '');
    if (!m) return null;
    var wall = Date.parse(m[1] + ':00Z');
    var guess = wall;
    for (var i = 0; i < 3; i++) guess = wall - (madridWallMs(new Date(guess)) - guess);
    var off = Math.round((madridWallMs(new Date(guess)) - guess) / 60000);
    var sign = off < 0 ? '-' : '+';
    off = Math.abs(off);
    return m[1] + ':00' + sign + pad(Math.floor(off / 60)) + ':' + pad(off % 60);
  }

  var fmtHuman = new Intl.DateTimeFormat('es-ES', {
    timeZone: MADRID, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  });
  var fmtHora = new Intl.DateTimeFormat('es-ES', { timeZone: MADRID, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });

  /* ---------------- GitHub ---------------- */
  function api(path, opts) {
    opts = opts || {};
    var headers = {
      'Accept': 'application/vnd.github+json',
      'Authorization': 'Bearer ' + token,
      'X-GitHub-Api-Version': '2022-11-28'
    };
    if (opts.body) headers['Content-Type'] = 'application/json';
    return fetch('https://api.github.com' + path, {
      method: opts.method || 'GET', headers: headers, body: opts.body, cache: 'no-store'
    });
  }
  function repoPath() {
    return '/repos/' + encodeURIComponent(cfg.owner) + '/' + encodeURIComponent(cfg.repo);
  }

  function errorFor(status, ctx) {
    if (status === 401) return 'El token no es válido o ha caducado.';
    if (status === 403) return 'El token no tiene permiso. Debe tener «Contents: Read and write» sobre este repositorio.';
    if (status === 404) return 'No se encuentra el repositorio, o el token no tiene acceso a él.';
    if (status === 409 || status === 422) return ctx === 'save'
      ? 'Alguien ha modificado la web mientras editabas. Recarga la página y repite tus cambios.'
      : 'No se pudo leer el archivo de datos.';
    return 'GitHub ha respondido con un error (' + status + '). Inténtalo de nuevo.';
  }

  async function load() {
    var r = await api(repoPath());
    if (!r.ok) throw new Error(errorFor(r.status));
    var info = await r.json();
    if (info.permissions && info.permissions.push === false) {
      throw new Error('Tu cuenta no tiene permiso de escritura en este repositorio.');
    }
    var f = await api(repoPath() + '/contents/' + FILE + '?ref=' + encodeURIComponent(cfg.branch));
    if (!f.ok) throw new Error(errorFor(f.status));
    var file = await f.json();
    var parsed = JSON.parse(fromB64(file.content));
    data = parsed;
    sha = file.sha;
    var src = Array.isArray(parsed.eventos) ? parsed.eventos : (parsed.proximaActividad ? [parsed.proximaActividad] : []);
    eventos = src.map(function (e) { return Object.assign({}, e); });
    dirty = false;
  }

  async function save() {
    var btn = $('btn-guardar');
    btn.disabled = true;
    msg('msg', 'Publicando…');
    try {
      var out = Object.assign({}, data);
      delete out.proximaActividad;
      out.eventos = ordenados();
      var body = JSON.stringify({
        message: 'Actualizar calendario de eventos',
        content: toB64(JSON.stringify(out, null, 2) + '\n'),
        sha: sha,
        branch: cfg.branch
      });
      var r = await api(repoPath() + '/contents/' + FILE, { method: 'PUT', body: body });
      if (!r.ok) throw new Error(errorFor(r.status, 'save'));
      var res = await r.json();
      sha = res.content.sha;
      data = out;
      dirty = false;
      msg('msg', 'Publicado. En uno o dos minutos se verá en la web.', 'ok');
    } catch (e) {
      msg('msg', e.message || 'No se pudo guardar.', 'err');
      dirty = true;
    }
    refresh();
  }

  /* ---------------- Interfaz ---------------- */
  function ordenados() {
    return eventos.slice().sort(function (a, b) { return new Date(a.inicio) - new Date(b.inicio); });
  }

  function refresh() {
    var list = $('lista');
    clear(list);
    var ev = ordenados();
    $('vacio').hidden = ev.length > 0;
    var now = Date.now();
    ev.forEach(function (e) {
      var ini = new Date(e.inicio);
      var fin = e.fin ? new Date(e.fin) : null;
      var pasado = (fin || ini).getTime() < now;
      var li = mk('li', 'admin-ev' + (pasado ? ' past' : ''));
      var info = mk('div', 'admin-ev-info');
      var h = mk('h3', 'serif', e.titulo || '(sin título)');
      if (pasado) h.appendChild(mk('span', 'tag', 'Pasado'));
      info.appendChild(h);
      var cuando = isNaN(ini) ? 'Fecha no válida' : fmtHuman.format(ini) + (fin && !isNaN(fin) ? ' – ' + fmtHora.format(fin) : '');
      info.appendChild(mk('p', null, cuando + (e.lugar ? ' · ' + e.lugar : '')));
      var btns = mk('div', 'admin-ev-btns');
      var b1 = mk('button', null, 'Editar');
      b1.type = 'button';
      b1.addEventListener('click', function () { abrirForm(e); });
      var b2 = mk('button', 'del', 'Eliminar');
      b2.type = 'button';
      b2.addEventListener('click', function () { eliminar(e); });
      btns.appendChild(b1);
      btns.appendChild(b2);
      li.appendChild(info);
      li.appendChild(btns);
      list.appendChild(li);
    });
    $('btn-guardar').disabled = !dirty;
    $('estado').textContent = (dirty ? 'Cambios sin publicar · ' : '') + eventos.length + (eventos.length === 1 ? ' evento' : ' eventos');
  }

  function abrirForm(e) {
    editando = e || 'nuevo';
    var f = $('form-evento');
    $('form-titulo').textContent = e ? 'Editar evento' : 'Nuevo evento';
    $('f-titulo').value = e ? (e.titulo || '') : '';
    $('f-desc').value = e ? (e.descripcion || '') : '';
    $('f-inicio').value = e ? isoToInput(e.inicio) : '';
    $('f-fin').value = e && e.fin ? isoToInput(e.fin) : '';
    $('f-lugar').value = e ? (e.lugar || '') : '';
    $('f-abierta').checked = e ? !!e.abierta : false;
    msg('form-msg', '');
    f.hidden = false;
    f.scrollIntoView({ behavior: 'smooth', block: 'start' });
    $('f-titulo').focus({ preventScroll: true });
  }
  function cerrarForm() {
    editando = null;
    $('form-evento').hidden = true;
  }

  function eliminar(e) {
    if (!window.confirm('¿Eliminar «' + (e.titulo || 'este evento') + '»? Se quitará de la web al publicar.')) return;
    eventos = eventos.filter(function (x) { return x !== e; });
    if (editando === e) cerrarForm();
    dirty = true;
    msg('msg', '');
    refresh();
  }

  function onSubmitEvento(ev) {
    ev.preventDefault();
    var titulo = $('f-titulo').value.trim();
    var inicio = inputToIso($('f-inicio').value);
    var fin = inputToIso($('f-fin').value);
    if (!titulo) return msg('form-msg', 'Escribe un título.', 'err');
    if (!inicio) return msg('form-msg', 'Indica cuándo empieza.', 'err');
    if (fin && new Date(fin) <= new Date(inicio)) return msg('form-msg', 'El evento debe terminar después de empezar.', 'err');

    var base = editando && editando !== 'nuevo' ? editando : {};
    var nuevo = {
      titulo: titulo,
      descripcion: $('f-desc').value.trim(),
      inicio: inicio,
      fin: fin || undefined,
      lugar: $('f-lugar').value.trim(),
      abierta: $('f-abierta').checked
    };
    var merged = Object.assign({}, base, nuevo);
    ['descripcion', 'fin', 'lugar'].forEach(function (k) { if (!merged[k]) delete merged[k]; });
    // orden estable de las claves en el JSON
    var ordered = {};
    ['titulo', 'descripcion', 'inicio', 'fin', 'lugar', 'abierta'].forEach(function (k) { if (k in merged) ordered[k] = merged[k]; });
    Object.keys(merged).forEach(function (k) { if (!(k in ordered)) ordered[k] = merged[k]; });

    if (editando === 'nuevo') eventos.push(ordered);
    else eventos[eventos.indexOf(editando)] = ordered;
    cerrarForm();
    dirty = true;
    msg('msg', 'Recuerda pulsar «Guardar y publicar» para que se vea en la web.');
    refresh();
  }

  function onInicioChange() {
    var i = $('f-inicio').value;
    var f = $('f-fin').value;
    if (!i) return;
    if (!f || f <= i) {
      $('f-fin').value = new Date(Date.parse(i + ':00Z') + 3600000).toISOString().slice(0, 16);
    }
  }

  function mostrarPanel(on) {
    $('login').hidden = on;
    $('panel').hidden = !on;
  }

  async function entrar(t, remember, auto) {
    token = t;
    var btn = $('login-btn');
    btn.disabled = true;
    msg('login-msg', 'Comprobando…');
    try {
      await load();
      if (remember) { localStorage.setItem(LS_TOKEN, token); sessionStorage.removeItem(LS_TOKEN); }
      else { sessionStorage.setItem(LS_TOKEN, token); localStorage.removeItem(LS_TOKEN); }
      localStorage.setItem(LS_CFG, JSON.stringify(cfg));
      $('token').value = '';
      msg('login-msg', '');
      mostrarPanel(true);
      refresh();
    } catch (e) {
      token = '';
      mostrarPanel(false);
      var texto = e instanceof TypeError ? 'No se pudo conectar con GitHub. Revisa tu conexión.' : (e.message || 'No se pudo entrar.');
      if (auto) { localStorage.removeItem(LS_TOKEN); sessionStorage.removeItem(LS_TOKEN); }
      msg('login-msg', texto, 'err');
    }
    btn.disabled = false;
  }

  function salir() {
    if (dirty && !window.confirm('Tienes cambios sin publicar. ¿Salir y descartarlos?')) return;
    dirty = false;
    token = '';
    localStorage.removeItem(LS_TOKEN);
    sessionStorage.removeItem(LS_TOKEN);
    cerrarForm();
    mostrarPanel(false);
    msg('login-msg', 'Sesión cerrada.');
  }

  function readCfgFromForm() {
    cfg.owner = $('cfg-owner').value.trim() || cfg.owner;
    cfg.repo = $('cfg-repo').value.trim() || cfg.repo;
    cfg.branch = $('cfg-branch').value.trim() || cfg.branch;
  }

  function initCfg() {
    // Si la web está en github.io/<repo>, se deduce solo
    var h = location.hostname;
    var m = /^([^.]+)\.github\.io$/i.exec(h);
    if (m) {
      var seg = location.pathname.split('/')[1];
      cfg.owner = m[1];
      if (seg && !/\.html?$/i.test(seg)) cfg.repo = seg;
    }
    try {
      var saved = JSON.parse(localStorage.getItem(LS_CFG) || 'null');
      if (saved && saved.owner && saved.repo && saved.branch) cfg = saved;
    } catch (e) { /* ignorar */ }
    $('cfg-owner').value = cfg.owner;
    $('cfg-repo').value = cfg.repo;
    $('cfg-branch').value = cfg.branch;
  }

  function start() {
    initCfg();
    $('login-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var t = $('token').value.trim();
      if (!t) return msg('login-msg', 'Pega tu token.', 'err');
      readCfgFromForm();
      entrar(t, $('recordar').checked, false);
    });
    $('btn-nuevo').addEventListener('click', function () { abrirForm(null); });
    $('btn-cancelar').addEventListener('click', cerrarForm);
    $('btn-guardar').addEventListener('click', save);
    $('btn-salir').addEventListener('click', salir);
    $('form-evento').addEventListener('submit', onSubmitEvento);
    $('f-inicio').addEventListener('change', onInicioChange);
    window.addEventListener('beforeunload', function (e) {
      if (dirty) { e.preventDefault(); e.returnValue = ''; }
    });

    var saved = localStorage.getItem(LS_TOKEN) || sessionStorage.getItem(LS_TOKEN);
    if (saved) {
      $('recordar').checked = !!localStorage.getItem(LS_TOKEN);
      entrar(saved, !!localStorage.getItem(LS_TOKEN), true);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
