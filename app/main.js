// Hearth & Ledger - state, routing and wiring. Session state only: the selected month, any
// expenses the visitor adds, which bills they have ticked off, and the goal sliders. Every
// view re-renders from that one state, so an edit anywhere shows up everywhere.
'use strict';

const state = {
  month: '2026-11',
  added: {}, // monthId -> [expenses added this session]
  paid: {}, // bill name -> true
  goalExtra: [0, 0, 0],
};

const app = document.getElementById('app');
const routes = {
  '/': { view: 'home', nav: 'home' },
  '/budget': { view: 'budget', nav: 'budget' },
  '/bills': { view: 'bills', nav: 'bills' },
  '/goals': { view: 'goals', nav: 'goals' },
  '/insights': { view: 'insights', nav: 'insights' },
};

function wireShared() {
  document.querySelectorAll('[data-month]').forEach((b) =>
    b.addEventListener('click', () => { state.month = b.dataset.month; render(); }));
}

function wireBudget() {
  const form = document.getElementById('add-form');
  if (!form) return;
  form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const fd = new FormData(form);
    const name = String(fd.get('name') || '').trim();
    const amt = Number(fd.get('amt'));
    const cat = String(fd.get('cat'));
    const day = Math.min(30, Math.max(1, Number(fd.get('day')) || 1));
    if (!name || !(amt > 0)) return;
    (state.added[state.month] = state.added[state.month] || []).push({ d: day, name, cat, amt });
    render();
    const note = document.getElementById('add-note');
    if (note) note.textContent = `Added "${name}" — ${'$' + amt.toLocaleString('en-US')} under ${catById(cat).name}. Every total in the book now includes it.`;
  });
}

function wireBills() {
  document.querySelectorAll('[data-pay]').forEach((b) =>
    b.addEventListener('click', () => {
      const name = b.dataset.pay;
      state.paid[name] = !state.paid[name];
      render();
    }));
}

function wireGoals() {
  document.querySelectorAll('input[data-goal]').forEach((r) =>
    r.addEventListener('input', () => {
      state.goalExtra[Number(r.dataset.goal)] = Number(r.value);
      render();
      const el = document.getElementById('gx-' + r.dataset.goal);
      if (el) el.focus();
    }));
}

function render() {
  const path = (location.hash.replace(/^#/, '') || '/').split('?')[0];
  const route = routes[path] || routes['/'];
  app.innerHTML = Views[route.view](state);
  document.querySelectorAll('.mainnav a').forEach((a) =>
    a.classList.toggle('active', a.dataset.nav === route.nav));
  wireShared();
  if (route.view === 'budget') wireBudget();
  if (route.view === 'bills') wireBills();
  if (route.view === 'goals') wireGoals();
  window.scrollTo(0, 0);
}

window.addEventListener('hashchange', render);
render();
