const KEY = 'wsc.v1';
const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
const state = Object.assign({ items: [], marks: [], last: 0, fs: 18, hide: false }, load());
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); return true; } catch { return false; } };
const SOURCE = 'https://ko.ligonier.org/resources/creeds-and-confessions/the-westminster-shorter-catechism/';
const app = document.getElementById('app');
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ui = { query: '', onlyMarked: false, listY: 0 };
document.documentElement.style.setProperty('--fs', state.fs + 'px');

function route() {
  if (!state.items.length) return renderSetup();
  const m = location.hash.match(/^#\/(\d+)$/);
  const n = m ? +m[1] : 0;
  if (n >= 1 && n <= state.items.length) renderReader(n); else renderList();
}

function renderSetup(error = '') {
  const ios = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const standalone = navigator.standalone || matchMedia('(display-mode: standalone)').matches;
  app.innerHTML = `
  <header class="head"><h1>소요리문답</h1><p>처음 한 번만 문답을 불러오면 돼요.</p></header>
  <section class="setup">
    ${ios && !standalone ? '<p class="note">아이폰은 Safari와 홈 화면 앱의 저장 공간이 따로예요. 공유 버튼에서 ‘홈 화면에 추가’를 먼저 한 뒤, 추가된 앱 안에서 아래 과정을 진행하세요.</p>' : ''}
    <ol>
      <li>아래 버튼으로 원문 페이지를 여세요.</li>
      <li>제목부터 107번 끝까지 선택해서 복사하세요. 페이지 전체를 복사해도 괜찮아요.</li>
      <li>이 화면으로 돌아와 붙여넣고 저장하세요.</li>
    </ol>
    <a class="btn" href="${SOURCE}" target="_blank" rel="noopener">원문 페이지 열기</a>
    <button class="btn" id="clip">클립보드에서 붙여넣기</button>
    <textarea id="raw" placeholder="복사한 내용을 여기에 붙여넣으세요" aria-label="복사한 내용"></textarea>
    <button class="btn main" id="go">문답 저장하기</button>
    <div class="err" role="alert">${esc(error)}</div>
  </section>`;
  const raw = document.getElementById('raw');
  document.getElementById('clip').onclick = async () => {
    try { raw.value = await navigator.clipboard.readText(); }
    catch { raw.focus(); document.querySelector('.err').textContent = '클립보드를 읽지 못했어요. 입력칸을 길게 눌러 직접 붙여넣으세요.'; }
  };
  document.getElementById('go').onclick = () => {
    const { items, missing } = parseCatechism(raw.value);
    if (missing.length) {
      const list = missing.length > 8 ? `${missing.slice(0, 8).join(', ')} 외 ${missing.length - 8}개` : missing.join(', ');
      return renderSetup(`${items.length}개만 찾았어요. 빠진 번호: ${list}. 1번부터 107번까지 모두 선택했는지 확인하고 다시 복사해 주세요.`);
    }
    state.items = items;
    if (!save()) { state.items = []; return renderSetup('휴대폰에 저장하지 못했어요. 비공개 브라우징을 끄고 다시 시도하세요.'); }
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist();
    location.hash = '#/'; route();
  };
}

function matches(it, q) {
  if (!q) return true;
  return String(it.n) === q || it.q.includes(q) || it.a.includes(q);
}

function rowsHtml() {
  const q = ui.query.trim();
  const rows = state.items.filter(it => matches(it, q) && (!ui.onlyMarked || state.marks.includes(it.n)));
  if (!rows.length) return `<p class="empty">${ui.onlyMarked && !q ? '별표한 문답이 없어요. 읽는 화면에서 ☆를 누르면 여기에 모여요.' : '찾는 내용이 없어요. 다른 낱말이나 번호로 찾아보세요.'}</p>`;
  let html = '', part = '';
  for (const it of rows) {
    const p = it.n <= 38 ? '믿어야 할 것 (1–38문)' : '하나님께서 요구하시는 본분 (39–107문)';
    if (!q && !ui.onlyMarked && p !== part) { html += `<h2 class="part">${p}</h2>`; part = p; }
    const hit = q && !it.q.includes(q) && it.a.includes(q) ? `<small>답: …${esc(it.a.slice(Math.max(0, it.a.indexOf(q) - 12), it.a.indexOf(q) + q.length + 18))}…</small>` : '';
    html += `<button class="row" data-n="${it.n}"><b>${it.n}</b><span>${esc(it.q)}${hit}</span><i>${state.marks.includes(it.n) ? '★' : ''}</i></button>`;
  }
  return html;
}

function renderList() {
  app.innerHTML = `
  <header class="head"><h1>웨스트민스터<br>소요리문답</h1><p>107개 문답</p></header>
  <div class="search">
    <input id="q" type="search" placeholder="낱말이나 번호로 찾기" aria-label="문답 찾기" value="${esc(ui.query)}">
    <div class="tabs"><button id="all" aria-pressed="${!ui.onlyMarked}">전체</button><button id="marked" aria-pressed="${ui.onlyMarked}">별표 (${state.marks.length})</button></div>
  </div>
  ${state.last ? `<button class="resume" data-n="${state.last}">${state.last}문부터 이어 읽기</button>` : ''}
  <div id="rows">${rowsHtml()}</div>
  <footer class="foot">본문 출처: <a href="${SOURCE}" target="_blank" rel="noopener">리고니어 미니스트리</a><br>
  <button id="reset">저장한 문답 지우기</button></footer>`;
  const rows = document.getElementById('rows');
  document.getElementById('q').oninput = e => { ui.query = e.target.value; rows.innerHTML = rowsHtml(); };
  const tab = v => () => { ui.onlyMarked = v; renderList(); };
  document.getElementById('all').onclick = tab(false);
  document.getElementById('marked').onclick = tab(true);
  document.getElementById('reset').onclick = () => {
    if (confirm('저장한 문답과 별표를 지울까요? 다시 쓰려면 원문을 다시 붙여넣어야 해요.')) {
      Object.assign(state, { items: [], marks: [], last: 0 }); save(); route();
    }
  };
  app.onclick = e => {
    const b = e.target.closest('[data-n]');
    if (b) { ui.listY = scrollY; location.hash = `#/${b.dataset.n}`; }
  };
  scrollTo(0, ui.listY);
}

function renderReader(n) {
  app.onclick = null;
  state.last = n; save();
  const it = state.items[n - 1];
  const total = state.items.length;
  const marked = state.marks.includes(n);
  app.innerHTML = `
  <article class="reader">
    <div class="bar">
      <button class="back" id="back">‹ 목록</button>
      <button class="small" id="minus" aria-label="글자 작게">가</button>
      <button class="large" id="plus" aria-label="글자 크게">가</button>
      <button class="star" id="star" aria-pressed="${marked}" aria-label="별표">${marked ? '★' : '☆'}</button>
    </div>
    <div class="scroll" id="scroll">
      <div class="call"><span class="tag">제<span class="num">${n}</span>문 / ${total}</span><h2>${esc(it.q)}</h2></div>
      <div class="resp">
        ${state.hide ? '<button class="reveal" id="reveal">눌러서 답 보기</button>' : `<p>${esc(it.a)}</p>`}
        <button class="hide" id="hide">${state.hide ? '답 항상 보이기' : '암송 연습: 답 가리기'}</button>
      </div>
    </div>
    <nav class="nav">
      <button id="prev" ${n === 1 ? 'disabled' : ''}>‹ 이전</button>
      <input id="seek" type="range" min="1" max="${total}" value="${n}" aria-label="문답 번호로 이동">
      <button id="next" ${n === total ? 'disabled' : ''}>다음 ›</button>
    </nav>
  </article>`;
  const go = k => { if (k >= 1 && k <= total) location.replace(`#/${k}`); };
  const $ = id => document.getElementById(id);
  $('back').onclick = () => { location.hash = '#/'; };
  $('prev').onclick = () => go(n - 1);
  $('next').onclick = () => go(n + 1);
  $('seek').onchange = e => go(+e.target.value);
  $('seek').oninput = e => { document.querySelector('.num').textContent = e.target.value; };
  const size = d => { state.fs = Math.min(30, Math.max(15, state.fs + d)); document.documentElement.style.setProperty('--fs', state.fs + 'px'); save(); };
  $('minus').onclick = () => size(-2);
  $('plus').onclick = () => size(2);
  $('star').onclick = () => {
    state.marks = marked ? state.marks.filter(x => x !== n) : [...state.marks, n].sort((a, b) => a - b);
    save(); renderReader(n);
  };
  $('hide').onclick = () => { state.hide = !state.hide; save(); renderReader(n); };
  if ($('reveal')) $('reveal').onclick = e => {
    const p = document.createElement('p'); p.textContent = it.a; e.currentTarget.replaceWith(p);
  };
  let sx = 0, sy = 0;
  const sc = $('scroll');
  sc.addEventListener('touchstart', e => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
  sc.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) go(dx < 0 ? n + 1 : n - 1);
  }, { passive: true });
}

addEventListener('keydown', e => {
  const m = location.hash.match(/^#\/(\d+)$/);
  if (!m || e.target.tagName === 'INPUT') return;
  if (e.key === 'ArrowRight' && +m[1] < state.items.length) location.replace(`#/${+m[1] + 1}`);
  if (e.key === 'ArrowLeft' && +m[1] > 1) location.replace(`#/${+m[1] - 1}`);
});
addEventListener('hashchange', route);
if ('serviceWorker' in navigator) {
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (hadController) location.reload(); });
  addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
route();
