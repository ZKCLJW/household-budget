// Hearth & Ledger - the views. Every number shown is computed from LEDGER (data.js) plus any
// expenses the visitor adds during the session: nothing is hard-coded, so the books balance on
// every page, in every month, after every edit.
'use strict';

// ---------- money + computation ----------
const $ = (n) => '$' + Math.round(n).toLocaleString('en-US');
const catById = (id) => LEDGER.categories.find((c) => c.id === id);
const incomeTotal = () => LEDGER.incomes.reduce((a, i) => a + i.monthly, 0);

function monthExpenses(state, monthId) {
  return [...(LEDGER.expenses[monthId] || []), ...(state.added[monthId] || [])]
    .sort((a, b) => a.d - b.d);
}
function spentByCat(state, monthId) {
  const map = {};
  for (const c of LEDGER.categories) map[c.id] = 0;
  for (const e of monthExpenses(state, monthId)) map[e.cat] = (map[e.cat] || 0) + e.amt;
  return map;
}
function spentTotal(state, monthId) {
  return monthExpenses(state, monthId).reduce((a, e) => a + e.amt, 0);
}
function monthMeta(monthId) { return LEDGER.months.find((m) => m.id === monthId); }

// ---------- shared pieces ----------
function monthBar(state) {
  const btns = LEDGER.months.map((m) =>
    `<button type="button" data-month="${m.id}" class="${m.id === state.month ? 'on' : ''}">${m.label.replace(' 2026', '')}</button>`).join('');
  const meta = monthMeta(state.month);
  const note = meta.closed ? 'Closed month — the books are final.'
    : `In progress — day ${meta.today} of ${meta.days}.`;
  return `<div class="monthbar"><span class="lbl">Month</span>${btns}<span class="today-note">${note}</span></div>`;
}

function envelope(cat, spent, state, monthId) {
  const meta = monthMeta(monthId);
  const pct = Math.min(100, (spent / cat.budget) * 100);
  const left = cat.budget - spent;
  let cls = 'ok';
  let hint;
  if (left < 0) {
    cls = 'over';
    hint = `<span class="hint bad">Over by ${$(-left)} — this envelope needs money moved into it.</span>`;
  } else if (left === 0) {
    cls = 'hot';
    hint = `<span class="hint">Fully spent — right on the budget, nothing left in this one.</span>`;
  } else if (!meta.closed && spent / cat.budget > (meta.today / meta.days) + 0.07) {
    cls = 'hot';
    hint = `<span class="hint">Running hot: ${$((left / (meta.days - meta.today + 1))).replace('.00', '')} a day left for the rest of the month.</span>`;
  } else if (!meta.closed) {
    hint = `<span class="hint">${$(left)} left — about ${$(left / Math.max(1, meta.days - meta.today + 1))} a day to the 30th.</span>`;
  } else {
    hint = `<span class="hint">${$(left)} left over at month's end.</span>`;
  }
  return `<div class="env">
    <div class="row"><span class="nm">${cat.name}</span><span class="amt">${$(spent)} of ${$(cat.budget)}</span></div>
    <div class="track"><div class="fill ${cls}" style="width:${pct}%;background:${cls === 'ok' ? cat.color : ''}"></div></div>
    ${hint}</div>`;
}

// ---------- charts ----------
function trendChart(state) {
  const w = 640, h = 250, pl = 48, pr = 12, pt = 22, pb = 30;
  const max = 7200;
  const bw = (w - pl - pr) / LEDGER.months.length;
  let grid = '';
  for (let g = 0; g <= 3; g++) {
    const v = max * g / 3;
    const y = pt + (1 - v / max) * (h - pt - pb);
    grid += `<line class="grid" x1="${pl}" y1="${y}" x2="${w - pr}" y2="${y}"/><text x="${pl - 6}" y="${y + 4}" text-anchor="end" font-size="12">$${Math.round(v / 1000)}k</text>`;
  }
  const inc = incomeTotal();
  const bars = LEDGER.months.map((m, i) => {
    const spent = spentTotal(state, m.id);
    const gx = pl + i * bw;
    const ih = (inc / max) * (h - pt - pb);
    const sh = (spent / max) * (h - pt - pb);
    return `<rect x="${gx + bw * 0.16}" y="${h - pb - ih}" width="${bw * 0.3}" height="${ih}" fill="#1f5c40" rx="2"/>` +
      `<rect x="${gx + bw * 0.54}" y="${h - pb - sh}" width="${bw * 0.3}" height="${sh}" fill="#c97b2d" rx="2"/>` +
      `<text x="${gx + bw * 0.31}" y="${h - pb - ih - 6}" text-anchor="middle" font-size="12" font-weight="bold">${$(inc)}</text>` +
      `<text x="${gx + bw * 0.69}" y="${h - pb - sh - 6}" text-anchor="middle" font-size="12" font-weight="bold">${$(spent)}</text>` +
      `<text x="${gx + bw * 0.5}" y="${h - 8}" text-anchor="middle" font-size="12.5">${m.label.replace(' 2026', '')}</text>`;
  }).join('');
  return `<svg class="chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="Income and spending by month">` +
    grid + `<line class="axis" x1="${pl}" y1="${h - pb}" x2="${w - pr}" y2="${h - pb}"/>${bars}</svg>` +
    `<div class="legend"><span><span class="sw" style="background:#1f5c40"></span>Take-home income</span><span><span class="sw" style="background:#c97b2d"></span>Spent</span></div>`;
}

function donut(state, monthId) {
  const byCat = spentByCat(state, monthId);
  const total = spentTotal(state, monthId);
  const entries = LEDGER.categories
    .map((c) => ({ c, v: byCat[c.id] || 0 }))
    .filter((e) => e.v > 0)
    .sort((a, b) => b.v - a.v);
  const top = entries.slice(0, 6);
  const other = entries.slice(6).reduce((a, e) => a + e.v, 0);
  if (other > 0) top.push({ c: { name: 'Everything else', color: '#b9ac8e' }, v: other });
  const C = 2 * Math.PI * 52;
  let acc = 0;
  const segs = top.map((e) => {
    const frac = e.v / total;
    const s = `<circle cx="70" cy="70" r="52" fill="none" stroke="${e.c.color}" stroke-width="22" stroke-dasharray="${(frac * C).toFixed(1)} ${C.toFixed(1)}" stroke-dashoffset="${(-acc * C).toFixed(1)}" transform="rotate(-90 70 70)"/>`;
    acc += frac;
    return s;
  }).join('');
  const legend = top.map((e) =>
    `<li><span class="sw" style="display:inline-block;width:12px;height:12px;border-radius:2px;background:${e.c.color};margin-right:6px"></span>${e.c.name} — <strong>${$(e.v)}</strong> (${(e.v / total * 100).toFixed(0)}%)</li>`).join('');
  return `<div class="donut-wrap">
    <svg width="140" height="140" viewBox="0 0 140 140" role="img" aria-label="Spending by category donut chart">${segs}
      <text x="70" y="66" text-anchor="middle" font-size="13" fill="#6f6a5c">spent</text>
      <text x="70" y="84" text-anchor="middle" font-size="15" font-weight="bold" fill="#23211b">${$(total)}</text></svg>
    <ul class="donut-legend">${legend}</ul></div>`;
}

// ---------- views ----------
const Views = {
  home(state) {
    const meta = monthMeta(state.month);
    const inc = incomeTotal();
    const spent = spentTotal(state, state.month);
    const left = inc - spent;
    const rate = Math.max(0, Math.round((left / inc) * 100));
    const byCat = spentByCat(state, state.month);
    const topCats = [...LEDGER.categories].sort((a, b) => (byCat[b.id] || 0) - (byCat[a.id] || 0)).slice(0, 6);
    const recent = [...monthExpenses(state, state.month)].reverse().slice(0, 8);
    const upcoming = LEDGER.bills.filter((b) => meta.closed ? false : b.due >= meta.today)
      .sort((a, b) => a.due - b.due).slice(0, 4);
    const goalsMini = LEDGER.goals.map((g) => {
      const pct = Math.round((g.saved / g.target) * 100);
      return `<div class="env"><div class="row"><span class="nm">${g.name}</span><span class="amt">${$(g.saved)} of ${$(g.target)}</span></div>
        <div class="track"><div class="fill ok" style="width:${pct}%;background:#1f5c40"></div></div></div>`;
    }).join('');
    return `
    <div class="hero"><h1>The month, <span class="accent">balanced.</span></h1>
    <p class="lede">One household's budget book: ${LEDGER.people}. Income lands, envelopes fill,
    bills leave on their due dates — and whatever is left goes to the goals, on purpose.</p></div>
    ${monthBar(state)}
    <div class="stat-grid">
      <div class="stat"><div class="v">${$(inc)}</div><div class="l">Take-home income</div><div class="s">${LEDGER.incomes.map((i) => i.name.split(' (')[0]).join(' + ')}</div></div>
      <div class="stat"><div class="v">${$(spent)}</div><div class="l">Spent ${meta.closed ? 'in the month' : 'so far'}</div><div class="s">${monthExpenses(state, state.month).length} entries in the book</div></div>
      <div class="stat ${left < 0 ? 'warn' : ''}"><div class="v">${$(left)}</div><div class="l">${meta.closed ? 'Kept at month\'s end' : 'Left to spend'}</div><div class="s">${meta.closed ? 'moved to goals and savings' : 'across all envelopes'}</div></div>
      <div class="stat"><div class="v">${rate}%</div><div class="l">Savings rate</div><div class="s">${meta.closed ? (rate >= 20 ? 'at the 20% goal — well kept' : rate >= 10 ? 'healthy; the goal is 20%' : 'below the 10% floor — see Insights') : 'so far — the month is still open'}</div></div>
    </div>
    <section class="block">
      <div class="two">
        <div class="panel"><h3>Where it is going — biggest envelopes</h3>
          ${topCats.map((c) => envelope(c, byCat[c.id] || 0, state, state.month)).join('')}
          <p class="note">All eleven envelopes live on the <a href="#/budget">Envelopes page</a>.</p>
        </div>
        <div>
          <div class="panel"><h3>Latest entries</h3>
            <ul class="txns">${recent.map((e) => `<li><span>${e.name}<span class="c">${catById(e.cat).name}</span></span><span class="num">${$(e.amt)}</span><span class="d">${meta.label.split(' ')[0].slice(0, 3)} ${e.d}</span></li>`).join('')}</ul>
          </div>
          <div class="panel"><h3>${meta.closed ? 'Savings goals' : 'Still to leave the account'}</h3>
            ${meta.closed ? goalsMini : (upcoming.length ? upcoming.map((b) => `<div class="env"><div class="row"><span class="nm">${b.name}</span><span class="amt">${$(b.amt)} · due ${meta.label.split(' ')[0].slice(0, 3)} ${b.due}</span></div></div>`).join('') : '<p class="note">Nothing else is due this month.</p>')}
            <p class="note">${meta.closed ? 'Progress across all three goals — the Goals page works out the finish lines.' : 'Every bill and its date is on the <a href="#/bills">Bills page</a>.'}</p>
          </div>
        </div>
      </div>
    </section>`;
  },

  budget(state) {
    const byCat = spentByCat(state, state.month);
    const catOptions = LEDGER.categories.map((c) => `<option value="${c.id}">${c.name}</option>`).join('');
    const meta = monthMeta(state.month);
    return `
    <div class="hero"><h1>Envelopes: <span class="accent">every dollar has a job</span></h1>
    <p class="lede">Eleven envelopes, one per kind of spending. The bar shows what has left; the
    note underneath does the kitchen-table maths — what is left, and what that means per day.</p></div>
    ${monthBar(state)}
    <section class="block">
      <div class="panel">
        ${LEDGER.categories.map((c) => envelope(c, byCat[c.id] || 0, state, state.month)).join('')}
      </div>
      <div class="panel">
        <h3>Add an expense to ${meta.label}</h3>
        <form class="add" id="add-form">
          <input name="name" required maxlength="48" placeholder="What was it? e.g. Bakery run">
          <input name="amt" required type="number" min="1" max="100000" step="0.01" placeholder="$">
          <select name="cat">${catOptions}</select>
          <input name="day" type="number" min="1" max="${meta.days || 31}" value="${meta.today || 15}" aria-label="Day of month">
          <button type="submit">Add it</button>
        </form>
        <p class="form-note" id="add-note"></p>
        <p class="note">Adding an entry updates every total in the book — this page, the month
        view, the Insights charts — because they are all computed from the same entries.</p>
      </div>
    </section>`;
  },

  bills(state) {
    const meta = monthMeta('2026-11');
    const rows = [...LEDGER.bills].sort((a, b) => a.due - b.due).map((b, i) => {
      const paid = state.paid[b.name];
      let status;
      if (paid) status = '<span class="pill">Paid</span>';
      else if (b.due < meta.today) status = '<span class="pill late">Was due — check it</span>';
      else if (b.due - meta.today <= 3) status = `<span class="pill due">Due in ${b.due - meta.today} day${b.due - meta.today === 1 ? '' : 's'}</span>`;
      else status = `<span class="pill">Due in ${b.due - meta.today} days</span>`;
      return `<tr class="${paid ? 'paid' : ''}"><td>${b.name}</td><td class="num">${$(b.amt)}</td>
        <td>Nov ${b.due}</td><td>${b.autopay ? 'Autopay' : 'Manual — by hand'}</td><td>${status}</td>
        <td><button type="button" class="paybtn ${paid ? 'done' : ''}" data-pay="${b.name}">${paid ? 'Paid ✓' : 'Mark paid'}</button></td></tr>`;
    }).join('');
    const total = LEDGER.bills.reduce((a, b) => a + b.amt, 0);
    const paidTotal = LEDGER.bills.filter((b) => state.paid[b.name]).reduce((a, b) => a + b.amt, 0);
    return `
    <div class="hero"><h1>Bills: <span class="accent">nothing arrives as a surprise</span></h1>
    <p class="lede">The nine regular bills, on their November dates. Eight run on autopay; the
    rent is paid by hand on the 1st, deliberately — it is the one number worth looking at every
    month. Marking a bill paid updates the month's position below.</p></div>
    <div class="stat-grid">
      <div class="stat"><div class="v">${$(total)}</div><div class="l">Bills every month</div><div class="s">across ${LEDGER.bills.length} bills</div></div>
      <div class="stat"><div class="v">${$(paidTotal)}</div><div class="l">Marked paid</div><div class="s">in this session's book</div></div>
      <div class="stat"><div class="v">${$(total - paidTotal)}</div><div class="l">Still to go out</div><div class="s">before Nov 30</div></div>
      <div class="stat"><div class="v">8 of 9</div><div class="l">On autopay</div><div class="s">rent is the manual one</div></div>
    </div>
    <section class="block">
      <table class="bills"><thead><tr><th>Bill</th><th class="num">Amount</th><th>Due</th><th>How it pays</th><th>Status</th><th></th></tr></thead>
      <tbody>${rows}</tbody></table>
      <p class="note">Due dates are November 2026's. A bill marked "was due" here is one whose
      date has passed without a paid mark in this session — in the family's real book it left on
      autopay; the button is how the paper copy gets ticked off.</p>
    </section>`;
  },

  goals(state) {
    const cards = LEDGER.goals.map((g, gi) => {
      const extra = state.goalExtra[gi] || 0;
      const monthly = g.monthly + extra;
      const months = Math.max(0, Math.ceil((g.target - g.saved) / monthly));
      const pct = Math.round((g.saved / g.target) * 100);
      const eta = new Date(2026, 10 + months, 1);
      const etaLabel = months === 0 ? 'funded' : eta.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      return `<div class="panel goal">
        <h3>${g.name}</h3>
        <p>${g.note}</p>
        <div class="track"><div class="fill" style="width:${pct}%"></div></div>
        <div class="meta"><span><b>${$(g.saved)}</b> saved of <b>${$(g.target)}</b> (${pct}%)</span>
        <span>Putting aside <b>${$(monthly)}</b>/month</span>
        <span>Finish line: <b>${etaLabel}</b>${months ? ` (${months} months)` : ''}</span></div>
        <label for="gx-${gi}" style="font-size:15px">Add extra each month: <b>$<span id="gxv-${gi}">${extra}</span></b></label>
        <input type="range" id="gx-${gi}" data-goal="${gi}" min="0" max="400" step="25" value="${extra}">
      </div>`;
    }).join('');
    return `
    <div class="hero"><h1>Goals: <span class="accent">savings with a finish line</span></h1>
    <p class="lede">Three pots, filled on payday before anything fun happens. Drag a slider to
    add extra each month and the finish line moves — that is the whole trick of a budget that
    works: the trade-off is visible.</p></div>
    <section class="block">${cards}</section>`;
  },

  insights(state) {
    const inc = incomeTotal();
    const spent = spentTotal(state, state.month);
    const byCat = spentByCat(state, state.month);
    const needs = LEDGER.categories.filter((c) => c.kind === 'need').reduce((a, c) => a + (byCat[c.id] || 0), 0);
    const wants = spent - needs;
    const saved = inc - spent;
    const pct = (v) => Math.round((v / inc) * 100);
    const ruleRow = (label, v, target, color) => {
      const p = pct(v);
      return `<div class="env"><div class="row"><span class="nm">${label}</span><span class="amt">${$(v)} — ${p}% of income (aim ${target}%)</span></div>
        <div class="track"><div class="fill" style="width:${Math.min(100, p * 1.6)}%;background:${color}"></div></div></div>`;
    };
    return `
    <div class="hero"><h1>Insights: <span class="accent">the honest mirror</span></h1>
    <p class="lede">Three months side by side, where the money actually went, and the 50/30/20
    check — needs near half of income, wants near a third, savings at a fifth.</p></div>
    ${monthBar(state)}
    <section class="block">
      <h2>Income against spending</h2>
      <div class="panel">${trendChart(state)}
      <p class="note">November is counted to the 27th; its bar will grow a little before the
      month closes. September kept $${(incomeTotal() - spentTotal(state, '2026-09')).toLocaleString('en-US')}, October $${(incomeTotal() - spentTotal(state, '2026-10')).toLocaleString('en-US')}.</p></div>
    </section>
    <section class="block">
      <h2>Where ${monthMeta(state.month).label.split(' ')[0]}'s money went</h2>
      <div class="panel">${donut(state, state.month)}</div>
    </section>
    <section class="block">
      <h2>The 50/30/20 check — ${monthMeta(state.month).label}</h2>
      <div class="panel rule-bars">
        ${ruleRow('Needs — housing, food, bills, getting around', needs, 50, '#1f5c40')}
        ${ruleRow('Wants — eating out, fun, subscriptions, extras', wants, 30, '#c97b2d')}
        ${ruleRow('Savings — what the month kept', saved, 20, '#24507e')}
        <p class="verdict" style="margin-top:10px">Verdict: needs run at <b>${pct(needs)}%</b> because
        Austin rent takes the first ${'$' + (byCat.housing || 0).toLocaleString('en-US')} of it; wants are a lean <b>${pct(wants)}%</b>, which is
        exactly what funds a savings rate of <b>${pct(saved)}%</b>${pct(saved) >= 20 ? ' — at the 20% mark. This household is not rich; it is deliberate.' : '.'}</p>
      </div>
    </section>`;
  },
};
