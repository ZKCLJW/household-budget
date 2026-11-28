// Hearth & Ledger - the views. Every number shown is computed from LEDGER (data.js) plus any
// expenses the visitor adds during the session: nothing is hard-coded, so the books balance on
// every page, in every month, after every edit.
'use strict';

// ---------- money + computation ----------
const $ = (n) => '$' + Math.round(n).toLocaleString('en-US');
const ord = (n) => n + (n % 10 === 1 && n !== 11 ? 'st' : n % 10 === 2 && n !== 12 ? 'nd' : n % 10 === 3 && n !== 13 ? 'rd' : 'th');
const nWord = (n) => ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight'][n] || String(n);
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
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
// The bill schedule is the ledger's nine regulars plus any the visitor adds this session.
function allBills(state) { return [...LEDGER.bills, ...(state.addedBills || [])]; }
// A goal's finish line, counted from December 2026 — the same maths the Goals page uses.
function goalMonths(goal, monthly) {
  return Math.max(0, Math.ceil((goal.target - goal.saved) / monthly));
}
function goalEta(months) {
  if (months === 0) return 'funded';
  return new Date(2026, 11 + months, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

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
    hint = `<span class="hint">${$(left)} left — about ${$(left / Math.max(1, meta.days - meta.today + 1))} a day to the ${ord(meta.days)}.</span>`;
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

function cumulativeChart(state) {
  const w = 640, h = 250, pl = 52, pr = 16, pt = 24, pb = 30;
  const inc = incomeTotal();
  let run = 0;
  const pts = [{ label: 'Start', v: 0 }];
  for (const m of LEDGER.months) {
    run += inc - spentTotal(state, m.id);
    pts.push({ label: m.label.split(' ')[0].slice(0, 3), v: run });
  }
  const max = Math.ceil((run * 1.08) / 4000) * 4000 || 4000;
  const x = (i) => pl + (i / (pts.length - 1)) * (w - pl - pr);
  const y = (v) => pt + (1 - v / max) * (h - pt - pb);
  let grid = '';
  for (let g = 0; g <= 3; g++) {
    const v = max * g / 3;
    const gy = y(v);
    grid += `<line class="grid" x1="${pl}" y1="${gy}" x2="${w - pr}" y2="${gy}"/><text x="${pl - 6}" y="${gy + 4}" text-anchor="end" font-size="12">$${Math.round(v / 1000)}k</text>`;
  }
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ');
  const area = `${line} L${x(pts.length - 1).toFixed(1)},${y(0)} L${x(0).toFixed(1)},${y(0)} Z`;
  const dots = pts.map((p, i) => {
    const last = i === pts.length - 1;
    return `<circle cx="${x(i)}" cy="${y(p.v)}" r="4" fill="#1f5c40"/>` +
      (i > 0 ? `<text x="${last ? x(i) - 4 : x(i)}" y="${y(p.v) - 10}" text-anchor="${last ? 'end' : 'middle'}" font-size="12.5" font-weight="bold">${$(p.v)}</text>` : '') +
      `<text x="${x(i)}" y="${h - 8}" text-anchor="middle" font-size="12.5">${p.label}</text>`;
  }).join('');
  return `<svg class="chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="Savings kept, accumulating month by month">` +
    grid + `<line class="axis" x1="${pl}" y1="${y(0)}" x2="${w - pr}" y2="${y(0)}"/>` +
    `<path d="${area}" fill="#1f5c40" opacity="0.13"/><path d="${line}" fill="none" stroke="#1f5c40" stroke-width="2.5"/>${dots}</svg>` +
    `<div class="legend"><span><span class="sw" style="background:#1f5c40"></span>Kept, added up month by month</span></div>`;
}

// The what-if bench: trim this month's actual spending in the "want" envelopes by a chosen
// percentage and watch the freed money move the savings rate and every goal's finish line.
// Nothing here writes to the book — it rehearses a decision using the month's real figures.
function whatifSection(state) {
  const inc = incomeTotal();
  const spent = spentTotal(state, state.month);
  const byCat = spentByCat(state, state.month);
  const wants = LEDGER.categories.filter((c) => c.kind === 'want');
  const freed = wants.reduce((a, c) => a + (byCat[c.id] || 0) * ((state.whatif[c.id] || 0) / 100), 0);
  const kept = inc - spent;
  const newRate = Math.round(((kept + freed) / inc) * 100);
  const monthName = monthMeta(state.month).label.split(' ')[0];
  const sliders = wants.map((c) => {
    const p = state.whatif[c.id] || 0;
    const cut = (byCat[c.id] || 0) * p / 100;
    return `<div class="env"><div class="row"><span class="nm">${c.name}</span><span class="amt">${$(byCat[c.id] || 0)} spent — trim <b>${p}%</b>${cut > 0 ? `, frees <b>${$(cut)}</b>` : ''}</span></div>
      <input type="range" data-whatif="${c.id}" min="0" max="50" step="5" value="${p}" aria-label="Trim ${c.name}, percent"></div>`;
  }).join('');
  const goalRows = LEDGER.goals.map((g) => {
    const m0 = goalMonths(g, g.monthly);
    const m1 = goalMonths(g, g.monthly + freed);
    return `<div class="env"><div class="row"><span class="nm">${g.name}</span><span class="amt">${goalEta(m0)} → <b>${goalEta(m1)}</b>${m1 < m0 ? ` — ${m0 - m1} month${m0 - m1 === 1 ? '' : 's'} sooner` : ''}</span></div></div>`;
  }).join('');
  return `<section class="block">
    <h2>What if the wants were trimmed?</h2>
    <p class="intro">Drag the sliders to rehearse a leaner ${monthName}: each one trims that
    envelope's actual spending this month, and the money it frees up is run through the same
    maths as the rest of the book — a new savings rate, and finish lines that move the way
    they do on the Goals page.</p>
    <div class="panel">${sliders}</div>
    <div class="stat-grid">
      <div class="stat"><div class="v">${$(freed)}</div><div class="l">Freed each month</div><div class="s">at these settings, from ${monthName}'s spending</div></div>
      <div class="stat"><div class="v">${Math.round((kept / inc) * 100)}% → ${newRate}%</div><div class="l">Savings rate</div><div class="s">${monthName}, before → after the trim</div></div>
      <div class="stat"><div class="v">${$(kept + freed)}</div><div class="l">Kept after the trim</div><div class="s">instead of ${$(kept)}</div></div>
      <div class="stat"><div class="v">${$(freed * 12)}</div><div class="l">Freed in a year</div><div class="s">if the trim held every month</div></div>
    </div>
    <div class="panel"><h3>If all of it went to one goal at a time</h3>${goalRows}
    <p class="note">Each line sends the whole freed amount to that one goal, on top of what it
    already gets — the honest way to compare them. The sliders change nothing in the book
    itself; they are a rehearsal, not an edit.</p></div>
  </section>`;
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
    const upcoming = allBills(state).filter((b) => meta.closed ? false : b.due >= meta.today)
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
    const meta = monthMeta('2026-12');
    const bills = allBills(state);
    const rows = [...bills].sort((a, b) => a.due - b.due).map((b) => {
      const paid = state.paid[b.name];
      let status;
      if (paid) status = '<span class="pill">Paid</span>';
      else if (b.due < meta.today) status = '<span class="pill late">Was due — check it</span>';
      else if (b.due - meta.today <= 3) status = `<span class="pill due">Due in ${b.due - meta.today} day${b.due - meta.today === 1 ? '' : 's'}</span>`;
      else status = `<span class="pill">Due in ${b.due - meta.today} days</span>`;
      return `<tr class="${paid ? 'paid' : ''}"><td>${b.name}</td><td class="num">${$(b.amt)}</td>
        <td>Dec ${b.due}</td><td>${b.autopay ? 'Autopay' : 'Manual — by hand'}</td><td>${status}</td>
        <td><button type="button" class="paybtn ${paid ? 'done' : ''}" data-pay="${b.name}">${paid ? 'Paid ✓' : 'Mark paid'}</button></td></tr>`;
    }).join('');
    const total = bills.reduce((a, b) => a + b.amt, 0);
    const paidTotal = bills.filter((b) => state.paid[b.name]).reduce((a, b) => a + b.amt, 0);
    const autoCount = bills.filter((b) => b.autopay).length;
    const manual = bills.filter((b) => !b.autopay);
    const manualNote = manual.length === 1
      ? `${manual[0].name.charAt(0).toLowerCase() + manual[0].name.slice(1)} is the manual one`
      : `${manual.length} are paid by hand`;
    return `
    <div class="hero"><h1>Bills: <span class="accent">nothing arrives as a surprise</span></h1>
    <p class="lede">The ${bills.length} regular bills, on their December dates. ${autoCount} run on autopay; the
    rent is paid by hand on the 1st, deliberately — it is the one number worth looking at every
    month. Marking a bill paid updates the month's position below, and a new regular bill can
    be added at the foot of the page.</p></div>
    <div class="stat-grid">
      <div class="stat"><div class="v">${$(total)}</div><div class="l">Bills every month</div><div class="s">across ${bills.length} bills</div></div>
      <div class="stat"><div class="v">${$(paidTotal)}</div><div class="l">Marked paid</div><div class="s">in this session's book</div></div>
      <div class="stat"><div class="v">${$(total - paidTotal)}</div><div class="l">Still to go out</div><div class="s">before Dec 31</div></div>
      <div class="stat"><div class="v">${autoCount} of ${bills.length}</div><div class="l">On autopay</div><div class="s">${manualNote}</div></div>
    </div>
    <section class="block">
      <table class="bills"><thead><tr><th>Bill</th><th class="num">Amount</th><th>Due</th><th>How it pays</th><th>Status</th><th></th></tr></thead>
      <tbody>${rows}</tbody></table>
      <p class="note">Due dates are December 2026's. A bill marked "was due" here is one whose
      date has passed without a paid mark in this session — in the family's real book it left on
      autopay; the button is how the paper copy gets ticked off.</p>
      <div class="panel">
        <h3>Add a regular bill</h3>
        <form class="add" id="bill-form">
          <input name="name" required maxlength="48" placeholder="Bill name, e.g. Piano lessons">
          <input name="amt" required type="number" min="1" max="100000" step="0.01" placeholder="$">
          <input name="due" type="number" min="1" max="31" value="15" aria-label="Due day of month">
          <label class="check"><input type="checkbox" name="autopay"> Autopay</label>
          <button type="submit">Add it</button>
        </form>
        <p class="form-note" id="bill-note"></p>
        <p class="note">A bill added here joins the table and the totals above at once — the
        same way the add-an-expense form feeds every page of the book.</p>
      </div>
    </section>`;
  },

  goals(state) {
    const cards = LEDGER.goals.map((g, gi) => {
      const extra = state.goalExtra[gi] || 0;
      const monthly = g.monthly + extra;
      const months = Math.max(0, Math.ceil((g.target - g.saved) / monthly));
      const pct = Math.round((g.saved / g.target) * 100);
      const eta = new Date(2026, 11 + months, 1);
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

  year(state) {
    const inc = incomeTotal();
    const rows = LEDGER.months.map((m) => {
      const spent = spentTotal(state, m.id);
      const kept = inc - spent;
      const byCat = spentByCat(state, m.id);
      const top = [...LEDGER.categories].sort((a, b) => (byCat[b.id] || 0) - (byCat[a.id] || 0))[0];
      return { m, spent, kept, rate: Math.round((kept / inc) * 100), top, topAmt: byCat[top.id] || 0 };
    });
    const totInc = inc * rows.length;
    const totSpent = rows.reduce((a, r) => a + r.spent, 0);
    const totKept = totInc - totSpent;
    const avgRate = Math.round((totKept / totInc) * 100);
    const closed = rows.filter((r) => r.m.closed);
    const best = [...closed].sort((a, b) => b.rate - a.rate)[0];
    const tight = [...closed].sort((a, b) => a.rate - b.rate)[0];
    const ef = LEDGER.goals[0];
    const efLeft = ef.target - ef.saved;
    const nMonths = nWord(rows.length);
    const openRow = rows.find((r) => !r.m.closed);
    const openName = openRow.m.label.split(' ')[0];
    const stillToLeave = LEDGER.bills.filter((b) => b.due > openRow.m.today).reduce((a, b) => a + b.amt, 0);
    const tableRows = rows.map((r) => `<tr>
      <td>${r.m.label}${r.m.closed ? '' : ' <span class="pill due">open</span>'}</td>
      <td class="num">${$(inc)}</td><td class="num">${$(r.spent)}</td>
      <td class="num"><strong>${$(r.kept)}</strong></td><td class="num">${r.rate}%</td>
      <td>${r.top.name} — ${$(r.topAmt)}</td></tr>`).join('');
    return `
    <div class="hero"><h1>The year so far: <span class="accent">${nMonths} months, one story</span></h1>
    <p class="lede">${rows[0].m.label.split(' ')[0]} to ${openName} in one look — what came in, what went out, and what the
    household kept, month by month. Every figure is summed from the same entries the other
    pages use, so this page cannot disagree with them.</p></div>
    <div class="stat-grid">
      <div class="stat"><div class="v">${$(totInc)}</div><div class="l">Income, ${nMonths} months</div><div class="s">${$(inc)} a month, two salaries</div></div>
      <div class="stat"><div class="v">${$(totSpent)}</div><div class="l">Spent, ${nMonths} months</div><div class="s">${rows.reduce((a, r) => a + monthExpenses(state, r.m.id).length, 0)} entries in the book</div></div>
      <div class="stat"><div class="v">${$(totKept)}</div><div class="l">Kept, ${nMonths} months</div><div class="s">before ${openName} has even closed</div></div>
      <div class="stat"><div class="v">${avgRate}%</div><div class="l">Average savings rate</div><div class="s">${avgRate >= 20 ? 'the goal is 20% — this book runs ahead of it' : 'against a goal of 20%'}</div></div>
    </div>
    <section class="block">
      <h2>Kept, piling up</h2>
      <div class="panel">${cumulativeChart(state)}
      <p class="note">${rows.every((r) => r.kept >= 0)
        ? 'The line only ever climbs: no month in this book spent more than came in.'
        : 'A month that spends more than comes in pulls the line down — the book shows it rather than hiding it.'}
      ${openName}'s point is counted to the ${ord(openRow.m.today)}, with ${$(stillToLeave)} of regular bills
      still to leave before the ${ord(openRow.m.days)} — it will settle a little lower than it stands today.</p></div>
    </section>
    <section class="block">
      <h2>Month by month</h2>
      <table class="bills"><thead><tr><th>Month</th><th class="num">Income</th><th class="num">Spent</th><th class="num">Kept</th><th class="num">Saved</th><th>Biggest envelope</th></tr></thead>
      <tbody>${tableRows}</tbody>
      <tfoot><tr><td><strong>${cap(nMonths)} months</strong></td><td class="num"><strong>${$(totInc)}</strong></td>
      <td class="num"><strong>${$(totSpent)}</strong></td><td class="num"><strong>${$(totKept)}</strong></td>
      <td class="num"><strong>${avgRate}%</strong></td><td></td></tr></tfoot></table>
      <div class="panel">
        <p class="verdict">Best closed month: <b>${best.m.label.split(' ')[0]}</b>, which kept ${$(best.kept)}
        (${best.rate}% of income). Tightest: <b>${tight.m.label.split(' ')[0]}</b>, at ${$(tight.kept)} (${tight.rate}%)${tight.rate >= 40
          ? ' — and even the tightest month kept more than two-fifths of what came in' : ''}. Across the ${nMonths} months the
        household kept <b>${$(totKept)}</b>; the ${ef.name.toLowerCase()} alone still wants ${$(efLeft)} of its
        ${$(ef.target)} target, which is where the Goals page points it.</p>
      </div>
    </section>`;
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
    <p class="lede">${cap(nWord(LEDGER.months.length))} months side by side, where the money actually went, the 50/30/20
    check — needs near half of income, wants near a third, savings at a fifth — and a what-if
    bench for rehearsing a leaner month.</p></div>
    ${monthBar(state)}
    <section class="block">
      <h2>Income against spending</h2>
      <div class="panel">${trendChart(state)}
      <p class="note">${LEDGER.months.find((m) => !m.closed).label.split(' ')[0]} is counted to the ${ord(LEDGER.months.find((m) => !m.closed).today)}; its bar will grow a little before the
      month closes. The closed months kept ${LEDGER.months.filter((m) => m.closed).map((m) => `${m.label.split(' ')[0]} ${$(inc - spentTotal(state, m.id))}`).join(', ')}.</p></div>
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
    </section>
    ${whatifSection(state)}`;
  },
};
